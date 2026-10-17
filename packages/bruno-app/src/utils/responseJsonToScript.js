/**
 * Helpers for the "convert a response JSON property into a test or
 * post-response script" feature (right-click a value in the JSON response
 * preview and generate bruno script code from its path).
 *
 * The JSON preview is rendered by react-json-view, which exposes no
 * right-click API, so `getResponseJsonPath` reads the path of the clicked
 * node out of react-json-view's rendered DOM. Nodes come in two shapes:
 * leaf values render as `.variable-row` (key in `.object-key` for object
 * properties, or a direct-child `.array-key` for array indices), while
 * objects and arrays render as `.object-key-val` whose key sits in the
 * brace span (`.object-key` / `.array-key` inside
 * `:scope > span > span > span`). Child nodes live in the node's
 * `.pushed-content` block, so the parent node is the next-outer
 * `.object-key-val` container.
 */

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

// react-json-view renders keys with quotes when `quotesOnKeys` is on.
const unquote = (text) => {
  const unquoted = (text || '').trim().replace(/^"/, '').replace(/"$/, '');
  // The root node is rendered with `name={false}`; its key span is empty,
  // but guard against the literal artifact anyway.
  return unquoted === '' || unquoted === 'false' ? null : unquoted;
};

const toIndex = (text) => {
  const index = Number((text || '').trim().replace(/:$/, ''));
  return Number.isInteger(index) ? index : null;
};

/**
 * Key of a leaf `.variable-row` node: a string key, a numeric array
 * index, or null when the row carries no key.
 */
const leafKeyOfRow = (row) => {
  // For leaf array items react-json-view nests the colon inside the
  // array-key span; for container array items it is a sibling span.
  const arrayKey = row.querySelector(':scope > .array-key');
  if (arrayKey) {
    return toIndex(arrayKey.textContent);
  }
  // The row's own key is the only `.object-key` inside the row: nested
  // rows render inside `.pushed-content`, which is a sibling of the row,
  // never a descendant.
  const keyEl = row.querySelector('.object-key');
  return keyEl ? unquote(keyEl.textContent) : null;
};

/**
 * Key of a container `.object-key-val` node (object or array): a string
 * key, a numeric array index, or null for the root node.
 */
const containerKeyOf = (container) => {
  const keyEl = container.querySelector(
    ':scope > span > span > span > .object-key, :scope > span > span > span > .array-key'
  );
  if (!keyEl) {
    return null;
  }
  if (keyEl.classList.contains('array-key')) {
    return toIndex(keyEl.textContent);
  }
  return unquote(keyEl.textContent);
};

/**
 * Given any DOM node inside the JSON tree (for example the node under a
 * right-click), return the path segments from the response root to that
 * node, e.g. `['properties', 'latestReportId']`. Array indices are
 * returned as numbers. Returns null when the target is not inside the
 * JSON tree.
 */
export const getResponseJsonPath = (target) => {
  const node = target && target.closest ? target.closest('.variable-row, .object-key-val') : null;
  if (!node) {
    return null;
  }
  const segments = [];
  let current = node;
  while (current) {
    const isLeaf = current.classList.contains('variable-row');
    const key = isLeaf ? leafKeyOfRow(current) : containerKeyOf(current);
    if (key !== null) {
      segments.unshift(key);
    }
    // Move up: a leaf row's parent node is its closest `.object-key-val`
    // container (visited next iteration so its key is read); a container's
    // parent is the next-outer `.object-key-val`.
    if (isLeaf) {
      current = current.closest('.object-key-val');
    } else {
      current =
        current.parentElement && current.parentElement.closest
          ? current.parentElement.closest('.object-key-val')
          : null;
    }
  }
  return segments.length ? segments : null;
};

/**
 * Build a JS accessor expression for the path rooted at `responseBody`,
 * e.g. `responseBody.properties.latestReportId` or
 * `responseBody["weird key"][0]`.
 */
export const buildAccessor = (segments) => {
  let accessor = 'responseBody';
  for (const segment of segments) {
    if (typeof segment === 'number' || (typeof segment === 'string' && /^\d+$/.test(segment))) {
      accessor += `[${segment}]`;
    } else if (IDENTIFIER.test(segment)) {
      accessor += `.${segment}`;
    } else {
      accessor += `[${JSON.stringify(segment)}]`;
    }
  }
  return accessor;
};

const toCamelCase = (name) =>
  name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part.charAt(0).toLowerCase() + part.slice(1) : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');

/**
 * Derive a variable name for `bru.setVar` from the path: the last
 * non-index segment, camelCased. Falls back to "value".
 */
export const variableNameForSegments = (segments) => {
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    if (typeof segment === 'number' || /^\d+$/.test(String(segment))) {
      continue;
    }
    const name = toCamelCase(String(segment));
    if (name) {
      return name;
    }
  }
  return 'value';
};

/**
 * Generate a post-response script snippet in bruno's own idiom,
 * following the shape proposed in the feature request:
 * `function onResponse(res) { ... } onResponse(res);`
 */
export const generatePostResponseSnippet = (segments) => {
  const accessor = buildAccessor(segments);
  const varName = variableNameForSegments(segments);
  return [
    'function onResponse(res) {',
    '  let responseBody = res.getBody();',
    `  bru.setVar("${varName}", ${accessor}); // generated from the response JSON`,
    '}',
    'onResponse(res);'
  ].join('\n');
};

/**
 * Generate a test snippet asserting the value at the path. Objects and
 * arrays use chai's deep equality (`.eql`); primitives use `.equal`.
 */
export const generateTestSnippet = (segments, value) => {
  const accessor = buildAccessor(segments);
  const lastKey = segments[segments.length - 1];
  const matcher = value !== null && typeof value === 'object' ? 'eql' : 'equal';
  return [
    `test("should have ${lastKey} in the response", function() {`,
    '  let responseBody = res.getBody();',
    `  expect(${accessor}).to.${matcher}(${JSON.stringify(value)});`,
    '});'
  ].join('\n');
};

/**
 * Append a generated snippet to an existing script/tests value,
 * keeping a blank line between blocks.
 */
export const appendSnippet = (existing, snippet) => {
  const trimmed = (existing || '').trimEnd();
  return trimmed ? `${trimmed}\n\n${snippet}` : snippet;
};
