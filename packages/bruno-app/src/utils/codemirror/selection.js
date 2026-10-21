const comparePositions = (a, b) => (a.line - b.line) || (a.ch - b.ch);

const isPositionWithinRange = (position, from, to) =>
  comparePositions(position, from) >= 0 && comparePositions(position, to) <= 0;

export const getCodeMirrorSelectionPayload = (editor, event) => {
  if (!editor || typeof editor.somethingSelected !== 'function' || !editor.somethingSelected()) {
    return null;
  }

  // getSelection() concatenates every range; read the text back so it matches the range we replace.
  const from = editor.getCursor('from');
  const to = editor.getCursor('to');
  const text = editor.getRange(from, to);

  if (!text || !text.trim()) {
    return null;
  }

  if (event && typeof editor.coordsChar === 'function') {
    // clientX/clientY are viewport-relative; CodeMirror defaults to page.
    const clicked = editor.coordsChar({ left: event.clientX, top: event.clientY }, 'window');
    if (clicked && !isPositionWithinRange(clicked, from, to)) {
      return null;
    }
  }

  return {
    text,
    from,
    to,
    editable: !editor.getOption('readOnly')
  };
};

const BRACE_LENGTH = 2;

const SCOPE_ACCESSOR = {
  request: 'getRequestVar',
  folder: 'getFolderVar',
  collection: 'getCollectionVar',
  environment: 'getEnvVar',
  global: 'getGlobalEnvVar'
};

const expandOverWrappingPair = (editor, from, to, opening, closing) => {
  if (from.ch < opening.length) {
    return null;
  }

  const openingFrom = { line: from.line, ch: from.ch - opening.length };
  const closingTo = { line: to.line, ch: to.ch + closing.length };

  if (editor.getRange(openingFrom, from) !== opening || editor.getRange(to, closingTo) !== closing) {
    return null;
  }

  return { from: openingFrom, to: closingTo };
};

// Selecting inside `{{var}}` should replace the whole reference rather than nest another one.
const expandOverWrappingBraces = (editor, from, to) =>
  expandOverWrappingPair(editor, from, to, '{'.repeat(BRACE_LENGTH), '}'.repeat(BRACE_LENGTH)) || { from, to };

// The javascript mode reuses `string-2` for both template literals and regexes (javascript.js:94 vs :174).
const QUOTED_TOKEN_TYPE = 'string';
const TEMPLATE_TOKEN_TYPE = 'string-2';
const STRING_TOKEN_TYPES = [QUOTED_TOKEN_TYPE, TEMPLATE_TOKEN_TYPE];
const REGEX_LITERAL = /^\/.*\/[gimsuy]*$/;

const stringTokenAt = (editor, from, to) => {
  if (from.line !== to.line || typeof editor.getTokenAt !== 'function') {
    return null;
  }

  const token = editor.getTokenAt(to);
  if (!token || !STRING_TOKEN_TYPES.includes(token.type) || REGEX_LITERAL.test(token.string)) {
    return null;
  }

  return from.ch >= token.start && to.ch <= token.end ? token : null;
};

const escapeForTemplateLiteral = (text) => text.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

// Re-encoding a backslash would mean decoding the literal first, so the caller bails instead.
const hasEscapeSequence = (text) => (text || '').includes('\\');

const buildStringSplice = (editor, token, from, to, reference) => {
  const interpolation = `\${${reference}}`;
  const quote = token.string[0];

  // A token stops at the line end, so a multi-line template's bounds are not the literal's.
  const spansWholeLiteral = token.string.length >= 2 && token.string.endsWith(quote);
  const line = editor.getLine(from.line);
  const before = spansWholeLiteral ? line.slice(token.start + 1, from.ch) : null;
  const after = spansWholeLiteral ? line.slice(to.ch, token.end - 1) : null;
  const literalRange = {
    from: { line: from.line, ch: token.start },
    to: { line: from.line, ch: token.end }
  };

  if (spansWholeLiteral && !before && !after) {
    return { text: reference, ...literalRange };
  }

  // Rebuilding a template would escape the `${...}` already in it, so swap in place.
  if (token.type === TEMPLATE_TOKEN_TYPE) {
    return { text: interpolation, from, to };
  }

  if (hasEscapeSequence(before) || hasEscapeSequence(after)) {
    return null;
  }

  return {
    text: `\`${escapeForTemplateLiteral(before)}${interpolation}${escapeForTemplateLiteral(after)}\``,
    ...literalRange
  };
};

export const resolveSelectionValue = (selection) => {
  const { editor, from, to, text, mode } = selection || {};

  if (!editor || !from || !to || mode === 'javascript' || typeof editor.getRange !== 'function') {
    return text;
  }

  const range = expandOverWrappingBraces(editor, from, to);
  return range.from === from && range.to === to ? text : editor.getRange(range.from, range.to);
};

export const buildVariableReference = ({ variableName, scopeType, script }) => {
  const accessor = script ? SCOPE_ACCESSOR[scopeType] : null;
  return accessor ? `bru.${accessor}('${variableName}')` : `{{${variableName}}}`;
};

export const replaceSelectionWithVariable = (selection, variableName, scopeType) => {
  const { editor, editable, from, to, text, mode } = selection || {};

  if (!editor || !editable || !from || !to) {
    return false;
  }

  if (editor.getRange(from, to) !== text) {
    return false;
  }

  const script = mode === 'javascript' && !!SCOPE_ACCESSOR[scopeType];
  const reference = buildVariableReference({ variableName, scopeType, script });

  if (!script) {
    const range = expandOverWrappingBraces(editor, from, to);
    editor.replaceRange(reference, range.from, range.to);
    return true;
  }

  const token = stringTokenAt(editor, from, to);

  if (!token) {
    editor.replaceRange(reference, from, to);
    return true;
  }

  const splice = buildStringSplice(editor, token, from, to, reference);
  if (!splice) {
    return false;
  }

  editor.replaceRange(splice.text, splice.from, splice.to);
  return true;
};
