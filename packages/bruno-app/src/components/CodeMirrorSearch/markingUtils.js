const VIEWPORT_BUFFER = 100;

/**
 * Clears all existing marks and redraws only matches visible in the current
 * viewport ± VIEWPORT_BUFFER lines. Always marks the active match regardless
 * of scroll position.
 *
 * @param {CodeMirror.Editor} editor
 * @param {Array}  matches      - full sorted match list
 * @param {number} activeIndex  - index of the current match
 * @param {Array}  marksRef     - mutable ref array to track active marks
 */
export function markViewportMatches(editor, matches, activeIndex, marksRef) {
  marksRef.forEach((mark) => mark.clear());
  marksRef.length = 0;

  if (!matches.length) return;

  const viewport = editor.getViewport();
  const fromLine = Math.max(0, viewport.from - VIEWPORT_BUFFER);
  const toLine = viewport.to + VIEWPORT_BUFFER;

  // Binary search for first match at or after fromLine
  let lo = 0, hi = matches.length - 1, start = matches.length;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (matches[mid].from.line >= fromLine) {
      start = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  const marked = new Set();
  for (let i = start; i < matches.length && matches[i].from.line <= toLine; i++) {
    const mark = editor.markText(matches[i].from, matches[i].to, {
      className: i === activeIndex ? 'cm-search-current' : 'cm-search-match',
      clearOnEnter: true
    });
    marksRef.push(mark);
    marked.add(i);
  }

  // Always mark the active match even if it's outside the viewport
  if (!marked.has(activeIndex) && matches[activeIndex]) {
    const mark = editor.markText(matches[activeIndex].from, matches[activeIndex].to, {
      className: 'cm-search-current',
      clearOnEnter: true
    });
    marksRef.push(mark);
  }
}

/**
 * Clears all active marks.
 *
 * @param {Array} marksRef - mutable ref array tracking active marks
 */
export function clearMarks(marksRef) {
  marksRef.forEach((mark) => mark.clear());
  marksRef.length = 0;
}
