import { findApiEntry, isEmptyCallBefore, renderApiDoc, IDENTIFIER_CHAR } from 'utils/codemirror/scriptApi';

const CodeMirror = require('codemirror');

const PATH_CHAR = /[\w$.]/;
const NON_CODE_TOKENS = /\b(string|comment)\b/;
const HOVER_DELAY_MS = 50;
const TOOLTIP_GAP_PX = 4;
const EDGE_MARGIN_PX = 15;

/**
 * The dotted member path that ends with the identifier at `ch`, such as `bru.setEnvVar` for a
 * pointer anywhere on `setEnvVar` in `bru.setEnvVar('a', 1)`. Zero-argument calls stay in the path
 * (`bru.cookies.jar().getCookie`), matching how the manifest names members of a call's result.
 * @param {string} line
 * @param {number} ch
 * @returns {{ path: string, start: number } | null} Null off an identifier, or when the chain starts
 *   from a call with arguments or an index result (`get(0).data`, `list[0].name`), which no
 *   documented path does.
 */
export const getApiPathAt = (line, ch) => {
  if (!IDENTIFIER_CHAR.test(line[ch] || '')) return null;

  let end = ch;
  while (end < line.length && IDENTIFIER_CHAR.test(line[end])) end++;
  let start = ch;
  while (start > 0) {
    if (PATH_CHAR.test(line[start - 1])) start--;
    else if (isEmptyCallBefore(line, start)) start -= 2;
    else break;
  }

  const path = line.slice(start, end);
  if (path.startsWith('.') || path.includes('..')) return null;
  return { path, start };
};

/**
 * The index of the character under the pointer. With `sticky: 'before'` it is `ch - 1`; a positive
 * `xRel` means past the line's end, and a negative `xRel` at `ch` 0 means left of the text.
 * @param {{ ch: number, sticky?: string, xRel?: number, outside?: number }} pos
 * @returns {number | null} Null when the pointer is left of the text or past the end of a line, or
 *   above or below the text
 */
const getCharUnderPointer = (pos) => {
  if (pos.outside) return null;
  if (pos.sticky !== 'before') return pos.ch === 0 && pos.xRel < 0 ? null : pos.ch;
  return pos.xRel > 0 ? null : pos.ch - 1;
};

/**
 * Shows API docs on hover in `cm`.
 * @param {Object} cm - CodeMirror instance
 * @param {{ scriptType: string }} options
 * @returns {Function} Removes the listeners and any open tooltip
 */
export const attachApiInfo = (cm, { scriptType }) => {
  const wrapper = cm.getWrapperElement();
  let hoverTimeout = null;
  let tooltip = null;
  let shownOccurrence = null;

  const hideTooltip = () => {
    tooltip?.remove();
    tooltip = null;
    shownOccurrence = null;
  };

  const showTooltip = (entry, anchor) => {
    hideTooltip();
    tooltip = document.createElement('div');
    tooltip.className = 'CodeMirror-brunoApiInfo';
    tooltip.setAttribute('data-testid', 'api-info-tooltip');
    tooltip.appendChild(renderApiDoc(entry));
    tooltip.addEventListener('mouseleave', hideTooltip);
    document.body.appendChild(tooltip);

    const maxLeft = window.innerWidth - tooltip.offsetWidth - EDGE_MARGIN_PX;
    const below = anchor.bottom + TOOLTIP_GAP_PX;
    const fitsBelow = below + tooltip.offsetHeight <= window.innerHeight - EDGE_MARGIN_PX;
    const top = fitsBelow ? below : anchor.top - TOOLTIP_GAP_PX - tooltip.offsetHeight;
    tooltip.style.left = `${Math.max(0, Math.min(anchor.left, maxLeft))}px`;
    tooltip.style.top = `${Math.max(0, top)}px`;
  };

  const showDocsAt = (point) => {
    const pos = cm.coordsChar(point, 'window');
    const ch = getCharUnderPointer(pos);
    const target = ch === null ? null : getApiPathAt(cm.getLine(pos.line) || '', ch);
    const token = target && cm.getTokenAt({ line: pos.line, ch: target.start + 1 });
    if (!target || NON_CODE_TOKENS.test(token?.type || '')) {
      hideTooltip();
      return;
    }

    const entry = findApiEntry(target.path, scriptType);
    if (!entry) {
      hideTooltip();
      return;
    }

    const occurrence = `${pos.line}:${target.start}:${entry.path}`;
    if (occurrence === shownOccurrence) return;
    showTooltip(entry, cm.charCoords({ line: pos.line, ch: target.start }, 'window'));
    shownOccurrence = occurrence;
  };

  const onMouseMove = (event) => {
    clearTimeout(hoverTimeout);
    const point = { left: event.clientX, top: event.clientY };
    hoverTimeout = setTimeout(() => showDocsAt(point), HOVER_DELAY_MS);
  };

  const onMouseLeave = (event) => {
    clearTimeout(hoverTimeout);
    if (!tooltip?.contains(event.relatedTarget)) hideTooltip();
  };

  const onEdit = () => {
    clearTimeout(hoverTimeout);
    hideTooltip();
  };

  wrapper.addEventListener('mousemove', onMouseMove);
  wrapper.addEventListener('mouseleave', onMouseLeave);
  cm.on('keydown', onEdit);
  cm.on('scroll', onEdit);

  return () => {
    clearTimeout(hoverTimeout);
    hideTooltip();
    wrapper.removeEventListener('mousemove', onMouseMove);
    wrapper.removeEventListener('mouseleave', onMouseLeave);
    cm.off('keydown', onEdit);
    cm.off('scroll', onEdit);
  };
};

CodeMirror.defineOption('brunoApiInfo', false, (cm, options) => {
  cm.state.brunoApiInfo?.detach();
  delete cm.state.brunoApiInfo;

  if (options) {
    cm.state.brunoApiInfo = { detach: attachApiInfo(cm, options) };
  }
});
