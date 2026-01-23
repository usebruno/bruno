import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { IconCopy, IconCheck } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

// JavaScript keywords
const JS_KEYWORDS = new Set([
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'false',
  'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let',
  'new', 'null', 'return', 'static', 'super', 'switch', 'this', 'throw',
  'true', 'try', 'typeof', 'undefined', 'var', 'void', 'while', 'with', 'yield'
]);

// Bruno API objects
const BRUNO_OBJECTS = new Set(['bru', 'req', 'res', 'test', 'expect']);

/**
 * Simple JavaScript tokenizer for syntax highlighting
 */
const tokenizeJS = (code) => {
  const tokens = [];
  let i = 0;

  while (i < code.length) {
    // Skip whitespace (preserve it)
    if (/\s/.test(code[i])) {
      let ws = '';
      while (i < code.length && /\s/.test(code[i])) {
        ws += code[i];
        i++;
      }
      tokens.push({ type: 'whitespace', value: ws });
      continue;
    }

    // Single-line comment
    if (code[i] === '/' && code[i + 1] === '/') {
      let comment = '';
      while (i < code.length && code[i] !== '\n') {
        comment += code[i];
        i++;
      }
      tokens.push({ type: 'comment', value: comment });
      continue;
    }

    // Multi-line comment
    if (code[i] === '/' && code[i + 1] === '*') {
      let comment = '';
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        comment += code[i];
        i++;
      }
      comment += '*/';
      i += 2;
      tokens.push({ type: 'comment', value: comment });
      continue;
    }

    // String (single or double quotes)
    if (code[i] === '"' || code[i] === '\'' || code[i] === '`') {
      const quote = code[i];
      let str = quote;
      i++;
      while (i < code.length && code[i] !== quote) {
        if (code[i] === '\\' && i + 1 < code.length) {
          str += code[i] + code[i + 1];
          i += 2;
        } else {
          str += code[i];
          i++;
        }
      }
      str += code[i] || '';
      i++;
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(code[i]) || (code[i] === '.' && /[0-9]/.test(code[i + 1]))) {
      let num = '';
      while (i < code.length && /[0-9.xXa-fA-F]/.test(code[i])) {
        num += code[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(code[i])) {
      let id = '';
      while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) {
        id += code[i];
        i++;
      }

      if (JS_KEYWORDS.has(id)) {
        tokens.push({ type: 'keyword', value: id });
      } else if (BRUNO_OBJECTS.has(id)) {
        tokens.push({ type: 'variable', value: id });
      } else if (code[i] === '(') {
        tokens.push({ type: 'function', value: id });
      } else if (id === 'true' || id === 'false' || id === 'null' || id === 'undefined') {
        tokens.push({ type: 'atom', value: id });
      } else {
        tokens.push({ type: 'property', value: id });
      }
      continue;
    }

    // Operators and punctuation
    const operators = ['===', '!==', '==', '!=', '<=', '>=', '=>', '&&', '||', '++', '--', '+=', '-=', '*=', '/='];
    let foundOp = false;
    for (const op of operators) {
      if (code.slice(i, i + op.length) === op) {
        tokens.push({ type: 'operator', value: op });
        i += op.length;
        foundOp = true;
        break;
      }
    }
    if (foundOp) continue;

    // Single character operators/punctuation
    if (/[+\-*/%=<>!&|^~?:]/.test(code[i])) {
      tokens.push({ type: 'operator', value: code[i] });
      i++;
      continue;
    }

    if (/[{}()\[\];,.]/.test(code[i])) {
      tokens.push({ type: 'punctuation', value: code[i] });
      i++;
      continue;
    }

    // Unknown character
    tokens.push({ type: 'text', value: code[i] });
    i++;
  }

  return tokens;
};

const CodeBlock = ({ code, language = 'javascript' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const lines = code.split('\n');

  const highlightedCode = useMemo(() => {
    if (language !== 'javascript' && language !== 'js') {
      return <code>{code}</code>;
    }

    const tokens = tokenizeJS(code);
    return (
      <code>
        {tokens.map((token, i) => {
          if (token.type === 'whitespace' || token.type === 'text') {
            return token.value;
          }
          return (
            <span key={i} className={`token-${token.type}`}>
              {token.value}
            </span>
          );
        })}
      </code>
    );
  }, [code, language]);

  return (
    <StyledWrapper>
      <div className="code-header">
        <span className="language-label">{language}</span>
        <button
          onClick={handleCopy}
          className={`copy-btn ${copied ? 'copied' : ''}`}
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
        </button>
      </div>
      <pre className="code-content">
        <div className="line-numbers">
          {lines.map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        {highlightedCode}
      </pre>
    </StyledWrapper>
  );
};

export default CodeBlock;
