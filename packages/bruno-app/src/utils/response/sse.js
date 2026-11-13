import { JSONPath } from 'jsonpath-plus';

export const DEFAULT_SSE_OPTIONS = {
  mode: 'auto',
  rules: [
    { name: 'content', path: '$.choices[0].delta.content', merge: 'append' },
    { name: 'reasoning', path: '$.choices[0].delta.reasoning_content', merge: 'append' }
  ],
  saveVariables: false
};

export const getSseStorageKey = (item, collection) => `sse-response-${JSON.stringify([collection.pathname, item.pathname || item.uid])}`;

// SSE events can span network chunks; a chunk can also contain several events.
export const createSseParser = (onEvent) => {
  let line = '';
  let data = [];
  let event = '';
  let skipLF = false;
  let atStart = true;

  const processLine = () => {
    if (!line) {
      if (data.length) onEvent({ event: event || 'message', data: data.join('\n') });
      data = [];
      event = '';
    } else if (!line.startsWith(':')) {
      const colon = line.indexOf(':');
      const field = colon < 0 ? line : line.slice(0, colon);
      let value = colon < 0 ? '' : line.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'data') data.push(value);
      if (field === 'event') event = value;
    }
    line = '';
  };

  return {
    push(chunk) {
      for (const char of chunk) {
        if (atStart) {
          atStart = false;
          if (char === '\uFEFF') continue;
        }
        if (skipLF) {
          skipLF = false;
          if (char === '\n') continue;
        }
        if (char === '\r' || char === '\n') {
          processLine();
          skipLF = char === '\r';
        } else {
          line += char;
        }
      }
    }
  };
};

export const validateSseRules = (rules) => {
  const names = new Set();
  return rules.map((rule) => {
    const name = rule.name.trim();
    if (!/^[\w.-]+$/.test(name)) return 'Enter a variable name using letters, numbers, underscores, dots or hyphens.';
    if (names.has(name)) return 'Variable names must be unique.';
    names.add(name);
    if (!rule.path.trim().startsWith('$')) return 'JSONPath must start with $.';
    const path = rule.path.trim();
    const stack = [];
    let quote = null;
    let escaped = false;
    for (const char of path) {
      if (escaped) {
        escaped = false; continue;
      }
      if (char === '\\') {
        escaped = true; continue;
      }
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === '"' || char === '\'') {
        quote = char;
      } else if (char === '[' || char === '(') {
        stack.push(char);
      } else if (char === ']' || char === ')') {
        if (stack.pop() !== (char === ']' ? '[' : '(')) return 'Enter a valid JSONPath expression.';
      }
    }
    if (quote || stack.length || path.endsWith('.')) return 'Enter a valid JSONPath expression.';
    try {
      JSONPath({ path: rule.path, json: {}, eval: false });
    } catch {
      return 'Enter a valid JSONPath expression.';
    }
    return null;
  });
};

export const createSseMerger = (options = DEFAULT_SSE_OPTIONS) => {
  const fields = new Map();
  let eventCount = 0;
  let matchedEventCount = 0;
  const errors = options.mode === 'custom' ? validateSseRules(options.rules) : [];

  const append = (name, value, merge = 'append') => {
    if (value === null || value === undefined || (value === '' && merge !== 'latest')) return false;
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    const previous = fields.get(name) || { name, text: '', count: 0 };
    fields.set(name, {
      name,
      text: merge === 'latest' ? text : previous.text + text,
      count: previous.count + 1
    });
    return true;
  };

  const autoMerge = (json, event) => {
    let matched = false;
    const add = (name, value) => {
      if (typeof value === 'string') matched = append(name, value) || matched;
    };
    if (typeof json === 'string') {
      add('content', json);
      return matched;
    }
    if (!json || typeof json !== 'object') return false;

    // OpenAI chat completions (including DeepSeek) and compatible APIs.
    if (Array.isArray(json.choices)) {
      json.choices.forEach((choice, index) => {
        if (!choice || typeof choice !== 'object') return;
        const choiceIndex = Number.isInteger(choice.index) && choice.index >= 0 ? choice.index : index;
        const suffix = choiceIndex === 0 ? '' : `[${choiceIndex}]`;
        const delta = choice.delta || choice.message;
        if (!delta) return;
        if (typeof delta.content === 'string') add(`content${suffix}`, delta.content);
        add(`reasoning${suffix}`, delta.reasoning_content ?? delta.reasoning);
        add(`refusal${suffix}`, delta.refusal);
      });
    }

    // OpenAI Responses API and Anthropic content blocks.
    const type = json.type || event;
    if (type === 'response.output_text.delta') add('content', json.delta);
    if (type === 'response.refusal.delta') add('refusal', json.delta);
    if (type === 'response.reasoning_text.delta' || type === 'response.reasoning_summary_text.delta') {
      add('reasoning', json.delta);
    }
    if (type === 'content_block_delta') {
      add('content', json.delta?.text);
      add('reasoning', json.delta?.thinking);
    }
    if (type === 'content_block_start') {
      add('content', json.content_block?.text);
      add('reasoning', json.content_block?.thinking);
    }

    // Gemini keeps reasoning and answer text in separate parts.
    if (Array.isArray(json.candidates)) {
      json.candidates.forEach((candidate, index) => {
        if (!candidate || typeof candidate !== 'object') return;
        const parts = candidate.content?.parts;
        if (!Array.isArray(parts)) return;
        const candidateIndex = Number.isInteger(candidate.index) && candidate.index >= 0 ? candidate.index : index;
        const suffix = candidateIndex === 0 ? '' : `[${candidateIndex}]`;
        parts.forEach((part) => {
          if (!part || typeof part !== 'object') return;
          add(`${part.thought ? 'reasoning' : 'content'}${suffix}`, part.text);
        });
      });
    }

    // Ollama /api/chat and /api/generate payloads carried over SSE.
    add('content', json.message?.content ?? json.response);
    add('reasoning', json.message?.thinking ?? json.thinking);
    return matched;
  };

  const parser = createSseParser(({ data, event }) => {
    eventCount++;
    if (data.trim() === '[DONE]') return;
    if (options.mode === 'text') {
      if (append('content', data)) matchedEventCount++;
      return;
    }
    let json;
    try {
      json = JSON.parse(data);
    } catch {
      if (options.mode === 'auto' && !/^[\s]*[\[{]/.test(data) && append('content', data)) matchedEventCount++;
      return;
    }

    if (options.mode === 'custom') {
      let matched = false;
      options.rules.forEach((rule, index) => {
        if (errors[index]) return;
        try {
          const values = JSONPath({ path: rule.path, json, eval: false });
          values.forEach((value) => {
            matched = append(rule.name.trim(), value, rule.merge) || matched;
          });
        } catch {
          errors[index] = 'Unable to evaluate JSONPath. Use a path without script expressions.';
        }
      });
      if (matched) matchedEventCount++;
    } else if (autoMerge(json, event)) {
      matchedEventCount++;
    }
  });

  return {
    push: (chunk) => parser.push(chunk),
    result: () => ({ fields: [...fields.values()], eventCount, matchedEventCount, errors: [...errors] })
  };
};
