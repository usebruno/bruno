import scriptApiManifest from './generated/script-api-manifest.json';

/*
 * The script API (`bru`, `req`, `res`, `test`, `expect`, …) as documented in @usebruno/js, read
 * from the manifest scripts/generate-script-api.js generates from its JSDoc. Each entry is one
 * member path with its signature, docs, the script contexts it exists in and the runtimes that
 * provide it.
 */

// The globals API hints start from; `showHintsFor` names them as hint groups.
export const API_ROOTS = ['bru', 'req', 'res'];

const GRPC_CONTEXTS = [...new Set(scriptApiManifest.flatMap((entry) => entry.contexts))]
  .filter((context) => context.startsWith('grpc:'));

// Every `showHintsFor` value that asks for API hints: a global, or a gRPC hook.
export const API_HINT_GROUPS = [...API_ROOTS, ...GRPC_CONTEXTS];

/**
 * The script contexts an editor is for, from its `showHintsFor` groups.
 *
 * A gRPC hook editor names its hook. An HTTP script editor names globals only; of those, only
 * post-response scripts and tests have a response, so an editor offering `res` is one of them.
 * @param {string[]} showHintsFor
 * @returns {string[]}
 */
export const getScriptContexts = (showHintsFor = []) => {
  const hooks = showHintsFor.filter((group) => GRPC_CONTEXTS.includes(group));
  if (hooks.length) return hooks;
  return showHintsFor.includes('res') ? ['post-response', 'tests'] : ['pre-request'];
};

const availableIn = (entry, contexts) => entry.contexts.some((context) => contexts.includes(context));

const rootOf = (path) => path.split('.')[0];

/**
 * The entries an editor's scripts can use: those under the requested globals, in its contexts.
 * @param {string[]} showHintsFor
 * @returns {object[]}
 */
export const getApiEntries = (showHintsFor = []) => {
  const contexts = getScriptContexts(showHintsFor);
  return scriptApiManifest.filter(
    (entry) => entry.kind !== 'global' && showHintsFor.includes(rootOf(entry.path)) && availableIn(entry, contexts)
  );
};

/**
 * Every entry for a path — one per signature of an overloaded method — that exists in `contexts`.
 * @param {string} path - A dotted member path, such as `bru.setEnvVar`.
 * @param {string[]} contexts
 * @returns {object[]}
 */
export const findApiEntries = (path, contexts) =>
  scriptApiManifest.filter((entry) => entry.path === path && availableIn(entry, contexts));

/**
 * The autocomplete texts of an entry: the path with the required parameters, and also with every
 * parameter when some are optional (`has(name)` and `has(name, value)`).
 *
 * Hint texts are split on `.` into segments, so a rest parameter is named without its `...`.
 * @param {object} entry
 * @returns {string[]}
 */
export const getHintTexts = (entry) => {
  if (entry.kind !== 'method') return [entry.path];
  const call = (params) => `${entry.path}(${params.map((param) => param.name).join(', ')})`;
  const required = call(entry.params.filter((param) => !param.optional && !param.rest));
  const all = call(entry.params);
  return required === all ? [all] : [required, all];
};

const isSafeModeAvailable = (entry) => entry.runtimes.includes('quickjs');

/** Appends `text` to `parent`, rendering `backticked` spans as code. */
const appendInlineMarkdown = (parent, text) => {
  text.split(/(`[^`]+`)/).forEach((part) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      const code = document.createElement('code');
      code.textContent = part.slice(1, -1);
      parent.appendChild(code);
    } else if (part) {
      parent.appendChild(document.createTextNode(part));
    }
  });
};

const appendParagraph = (parent, className, text) => {
  const paragraph = document.createElement('p');
  paragraph.className = className;
  appendInlineMarkdown(paragraph, text);
  parent.appendChild(paragraph);
};

/**
 * Renders an entry's docs: signature, summary, description, first example and a Safe Mode note.
 * Shared by the autocomplete detail panel and the hover tooltip.
 * @param {object} entry
 * @returns {HTMLElement}
 */
export const renderApiDoc = (entry) => {
  const container = document.createElement('div');
  container.className = 'bruno-api-doc';

  const signature = document.createElement('code');
  signature.className = 'bruno-api-doc-signature';
  signature.setAttribute('data-testid', 'api-doc-signature');
  const parentPath = entry.path.includes('.') ? entry.path.slice(0, entry.path.lastIndexOf('.') + 1) : '';
  signature.textContent = `${parentPath}${entry.signature}`;
  container.appendChild(signature);

  if (entry.summary) appendParagraph(container, 'bruno-api-doc-summary', entry.summary);
  if (entry.description) {
    entry.description.split(/\n\s*\n/).forEach((paragraph) => {
      appendParagraph(container, 'bruno-api-doc-description', paragraph.replace(/\s*\n\s*/g, ' '));
    });
  }

  if (entry.examples.length) {
    const example = document.createElement('pre');
    example.className = 'bruno-api-doc-example';
    example.textContent = entry.examples[0];
    container.appendChild(example);
  }

  if (!isSafeModeAvailable(entry)) {
    const note = document.createElement('p');
    note.className = 'bruno-api-doc-note';
    note.setAttribute('data-testid', 'api-doc-safe-mode-note');
    note.textContent = 'Not available in Safe Mode.';
    container.appendChild(note);
  }

  return container;
};
