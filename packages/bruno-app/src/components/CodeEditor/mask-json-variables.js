// Masks Bruno template variables ({{name}}) in a JSON body so the editor's lint
// pass can syntax-check it *before* the request send path interpolates the real
// values. A variable may splice either a single JSON value or a whole fragment
// (several array elements / object members), so the mask must be position-aware:
//
//   - Value position  (nearest non-whitespace char before it is `:`, or the
//     placeholder is the whole body) — the variable stands for one value, so it
//     is replaced by `1`.
//   - Element position (anything else: between `[`, `{`, `,`, `]`, `}`) — the
//     variable may splice several elements, so it is marked for removal and the
//     commas its removal dislodges are cleaned up at that spot only.
//   - Inside a quoted JSON string — left untouched (its value may legitimately
//     contain quotes/braces). The lookbehind/lookahead guard skips a placeholder
//     that sits inside a quoted string; the lookahead also stops at `{` so a
//     standalone fragment followed by the next object is not mistaken for a
//     quoted value.
//
// Pure: no window, CodeMirror, or React — directly unit-testable with jsonlint.

const UNQUOTED_PLACEHOLDER = /(?<!"[^":{]*){{[^}]*}}(?![^"},{]*")/g;
const WHITESPACE = /\s/;

// Marks where an element-position placeholder was removed, so the comma clean-up
// below stays scoped to the removal site and never rewrites real commas the user
// typed elsewhere or inside a string literal. A private-use char never occurs in
// real JSON and is never produced by the masking regex above.
const REMOVED_ELEMENT = '\uE000';

function nearestNonWhitespaceBefore(text, end) {
  for (let j = end - 1; j >= 0; j -= 1) {
    if (!WHITESPACE.test(text[j])) {
      return text[j];
    }
  }
  return '';
}

export function maskJsonTemplateVariables(text) {
  const masked = text.replace(UNQUOTED_PLACEHOLDER, (_match, offset) => {
    const previous = nearestNonWhitespaceBefore(text, offset);
    return previous === ':' || previous === '' ? '1' : REMOVED_ELEMENT;
  });

  // Nothing to clean up unless at least one element-position placeholder was removed.
  if (!masked.includes(REMOVED_ELEMENT)) {
    return masked;
  }

  // A bare removal can leave `, REMOVED ,` (middle element), `[{ REMOVED ,`
  // (first element, now a leading comma), or `, REMOVED ]}` (last element, now a
  // trailing comma). Looped so runs of adjacent removals fully reduce; a leftover
  // marker with no adjacent comma (an only-element fragment) is dropped last.
  let out = masked;
  let previous;
  do {
    previous = out;
    out = out
      .replace(/,\s*\uE000\s*,/g, ',')
      .replace(/([\[\{])\s*\uE000\s*,/g, '$1')
      .replace(/,\s*\uE000\s*(?=[\]\}])/g, '');
  } while (out !== previous);

  return out.replace(/\uE000/g, '');
}
