import { SCRIPT_TYPES } from '@usebruno/common';
import scriptApiManifest from 'script-api-manifest';
import { EXTERNAL_LINK_ICON_SVG_TEXT } from 'utils/codemirror/scopeIcons';
import { createCopyButton } from 'utils/codemirror/copyButton';

const SCRIPT_API_REFERENCE_URL = 'https://api-reference.usebruno.com/';

const CALLABLE_GLOBAL_INTERFACES = { res: 'Response' };
const FUNCTION_GLOBALS = ['test'];

export const HINT_ROOTS = ['bru', 'req', 'res'];

const GRPC_SCRIPT_TYPES = [
  SCRIPT_TYPES.BEFORE_CALL_START,
  SCRIPT_TYPES.BEFORE_MESSAGE_SEND,
  SCRIPT_TYPES.AFTER_MESSAGE_RECEIVE,
  SCRIPT_TYPES.AFTER_CALL_END
];

// An editor's `scriptType` is the manifest's context name, except that the manifest prefixes gRPC hooks.
const toContext = (scriptType) => (GRPC_SCRIPT_TYPES.includes(scriptType) ? `grpc:${scriptType}` : scriptType);

const rootOf = (path) => path.split('.')[0];

export const IDENTIFIER_CHAR = /[\w$]/;

/**
 * Whether the `()` ending just before `index` is a zero-argument call of a member that the path
 * continues from, as `jar()` in `jar().getCookie`. The manifest names members of a call's result
 * this way, so a path scanned back from a member keeps such calls.
 * @param {string} line
 * @param {number} index - The position of the `.` after the call
 * @returns {boolean}
 */
export const isEmptyCallBefore = (line, index) =>
  line.slice(index - 2, index) === '()' && line[index] === '.' && IDENTIFIER_CHAR.test(line[index - 3] || '');

/**
 * The entries an editor's script can use: those under the requested globals that exist in its script.
 * @param {string[]} showHintsFor
 * @param {string} scriptType - The editor's script, such as `pre-request` or `before-call-start`.
 * @returns {object[]}
 */
export const getApiEntries = (showHintsFor = [], scriptType) => {
  const context = toContext(scriptType);
  return scriptApiManifest.filter(
    (entry) => entry.kind !== 'global' && showHintsFor.includes(rootOf(entry.path)) && entry.contexts.includes(context)
  );
};

/**
 * The entry for a path, if it exists in the script.
 * @param {string} path - A dotted member path, such as `bru.setEnvVar`.
 * @param {string} scriptType
 * @returns {object|null}
 */
export const findApiEntry = (path, scriptType) => {
  const context = toContext(scriptType);
  return scriptApiManifest.find((entry) => entry.path === path && entry.contexts.includes(context)) ?? null;
};

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

const appendSpan = (parent, className, text) => {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  parent.appendChild(span);
};

/**
 * The signature's text in parts, with parameter names and types marked for coloring.
 * @param {object} entry
 * @returns {{ text: string, className?: string }[] | null}
 */
const getSignatureParts = (entry) => {
  const name = entry.path.slice(entry.path.lastIndexOf('.') + 1);
  const type = (text) => ({ text, className: 'bruno-api-doc-type' });

  if (entry.returns) {
    const params = entry.params.flatMap((param, index) => [
      ...(index > 0 ? [{ text: ', ' }] : []),
      { text: `${param.rest ? '...' : ''}${param.name}${param.optional ? '?' : ''}`, className: 'bruno-api-doc-param-name' },
      { text: ': ' },
      type(param.type)
    ]);
    return [{ text: `${name}(` }, ...params, { text: '): ' }, type(entry.returns.type)];
  }

  const typePrefix = `${name}: `;
  return entry.signature.startsWith(typePrefix)
    ? [{ text: typePrefix }, type(entry.signature.slice(typePrefix.length))]
    : null;
};

const appendSignature = (parent, entry) => {
  const signature = document.createElement('code');
  signature.className = 'bruno-api-doc-signature';
  signature.setAttribute('data-testid', 'api-doc-signature');
  const parentPath = entry.path.includes('.') ? entry.path.slice(0, entry.path.lastIndexOf('.') + 1) : '';

  const parts = getSignatureParts(entry);
  if (parts && parts.map((part) => part.text).join('') === entry.signature) {
    signature.appendChild(document.createTextNode(parentPath));
    parts.forEach(({ text, className }) => {
      if (className) appendSpan(signature, className, text);
      else signature.appendChild(document.createTextNode(text));
    });
  } else {
    signature.textContent = `${parentPath}${entry.signature}`;
  }
  parent.appendChild(signature);
};

/**
 * The entry's TypeDoc page: its parent's interface, anchored by the lowercased member name, or else
 * its global's page.
 * @param {object} entry
 * @returns {string}
 */
const getReferenceUrl = (entry) => {
  const global = rootOf(entry.path);
  const globalUrl = new URL(`${FUNCTION_GLOBALS.includes(global) ? 'functions' : 'variables'}/${global}.html`, SCRIPT_API_REFERENCE_URL).href;
  const lastDot = entry.path.lastIndexOf('.');
  if (lastDot === -1) return globalUrl;

  const parentPath = entry.path.slice(0, lastDot);
  const isCall = parentPath.endsWith('()');
  const parent = scriptApiManifest.find((candidate) => candidate.path === (isCall ? parentPath.slice(0, -2) : parentPath));
  const typeText = isCall ? parent?.returns?.type : parent?.signature.slice(parent.signature.indexOf(': ') + 2);
  const owner = Object.hasOwn(CALLABLE_GLOBAL_INTERFACES, parentPath)
    ? CALLABLE_GLOBAL_INTERFACES[parentPath]
    : (typeText || '').replace(/ \| (null|undefined)/g, '');
  if (!/^\w+$/.test(owner)) return globalUrl;

  return new URL(`interfaces/${owner}.html#${entry.path.slice(lastDot + 1).toLowerCase()}`, SCRIPT_API_REFERENCE_URL).href;
};

const appendDocsLink = (parent, entry) => {
  const link = document.createElement('a');
  link.className = 'bruno-api-doc-link';
  link.setAttribute('data-testid', 'api-doc-link');
  link.href = getReferenceUrl(entry);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.innerHTML = EXTERNAL_LINK_ICON_SVG_TEXT;
  link.appendChild(document.createTextNode('Docs'));
  parent.appendChild(link);
};

/**
 * Renders an entry's docs: signature, summary, description, first example and a link to the docs.
 * @param {object} entry
 * @returns {HTMLElement}
 */
export const renderApiDoc = (entry) => {
  const container = document.createElement('div');
  container.className = 'bruno-api-doc';

  appendSignature(container, entry);

  if (entry.summary) appendParagraph(container, 'bruno-api-doc-summary', entry.summary);
  if (entry.description) {
    entry.description.split(/\n\s*\n/).forEach((paragraph) => {
      appendParagraph(container, 'bruno-api-doc-description', paragraph.replace(/\s*\n\s*/g, ' '));
    });
  }

  if (entry.examples.length) {
    const example = document.createElement('div');
    example.className = 'bruno-api-doc-example';
    const code = document.createElement('pre');
    code.textContent = entry.examples[0];
    example.appendChild(code);
    example.appendChild(createCopyButton(() => entry.examples[0], { testId: 'api-doc-example-copy' }));
    container.appendChild(example);
  }

  appendDocsLink(container, entry);

  return container;
};
