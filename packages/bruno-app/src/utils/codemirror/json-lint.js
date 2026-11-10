import * as jsonlint from '@prantlf/jsonlint';
import stripJsonComments from 'strip-json-comments';

const parser = jsonlint.parser || jsonlint;

/**
 * Validate JSON text and describe any syntax error as a lint annotation.
 *
 * The range covers the whole line where the parser reported the error, not a
 * zero-width point. A zero-width range draws nothing in the editor, so the
 * error would only be visible as a gutter marker. jsonlint reports only the
 * start of the error, so the line is the smallest range we can highlight.
 *
 * Positions are 0-based CodeMirror-style `{ line, ch }` objects.
 *
 * @param {string} text - the document text, including {{variable}} placeholders and comments
 * @returns {Array<{from: {line: number, ch: number}, to: {line: number, ch: number}, message: string, severity: string}>}
 */
export const getJsonLintAnnotations = (text) => {
  try {
    parser.parse(stripJsonComments(text.replace(/(?<!"[^":{]*){{[^}]*}}(?![^"},]*")/g, '1')));
    return [];
  } catch (error) {
    const { message, location } = error;
    const line = location?.start?.line;

    if (!line) {
      return [];
    }

    const lineIndex = line - 1;
    const lineText = text.split('\n')[lineIndex] ?? '';

    return [
      {
        from: { line: lineIndex, ch: 0 },
        // Keep at least one column so the error is still visible on an empty line.
        to: { line: lineIndex, ch: Math.max(lineText.length, 1) },
        message,
        severity: 'error'
      }
    ];
  }
};
