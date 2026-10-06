import { findApiEntries, getScriptContexts, renderApiDoc } from 'utils/codemirror/scriptApi';

const CodeMirror = require('codemirror');

/*
 * The `brunoApiInfo` CodeMirror option: hovering a documented script API member, such as
 * `bru.setEnvVar` or `req.headerList.upsert`, shows its docs in a tooltip. The path is read from
 * the text, so an alias (`const h = req.headerList; h.get(…)`) is not resolved.
 *
 * Value: `{ showHintsFor }`, the editor's autocomplete groups, which say which contexts its
 * scripts run in; members that don't exist there get no tooltip.
 */

const IDENTIFIER_CHAR = /[\w$]/;
const PATH_CHAR = /[\w$.]/;
// A `bru.getVar` inside a string or a comment is text, not a call.
const NON_CODE_TOKENS = /\b(string|comment)\b/;
const HOVER_DELAY_MS = 300;
const TOOLTIP_GAP_PX = 4;
const EDGE_MARGIN_PX = 15;

/**
 * The dotted member path that ends with the identifier at `ch`, such as `bru.setEnvVar` for a
 * pointer anywhere on `setEnvVar` in `bru.setEnvVar('a', 1)`.
 * @param {string} line
 * @param {number} ch
 * @returns {{ path: string, start: number } | null} Null off an identifier, or when the chain starts
 *   from a call or index result (`jar().getCookie`), which no documented path does.
 */
export const getApiPathAt = (line, ch) => {
  if (!IDENTIFIER_CHAR.test(line[ch] || '')) return null;

  let end = ch;
  while (end < line.length && IDENTIFIER_CHAR.test(line[end])) end++;
  let start = ch;
  while (start > 0 && PATH_CHAR.test(line[start - 1])) start--;

  const path = line.slice(start, end);
  if (path.startsWith('.') || path.includes('..')) return null;
  return { path, start };
};

/**
 * Shows API docs on hover in `cm`.
 * @param {Object} cm - CodeMirror instance
 * @param {{ showHintsFor: string[] }} options
 * @returns {Function} Removes the listeners and any open tooltip
 */
export const attachApiInfo = (cm, { showHintsFor }) => {
  const contexts = getScriptContexts(showHintsFor);
  const wrapper = cm.getWrapperElement();
  let hoverTimeout = null;
  let tooltip = null;
  let shownPath = null;

  const hideTooltip = () => {
    tooltip?.remove();
    tooltip = null;
    shownPath = null;
  };

  const showTooltip = (entry, anchor) => {
    hideTooltip();
    tooltip = document.createElement('div');
    tooltip.className = 'CodeMirror-brunoApiInfo';
    tooltip.setAttribute('data-testid', 'api-info-tooltip');
    tooltip.appendChild(renderApiDoc(entry));
    tooltip.addEventListener('mouseleave', hideTooltip);
    document.body.appendChild(tooltip);
    shownPath = entry.path;

    const maxLeft = window.innerWidth - tooltip.offsetWidth - EDGE_MARGIN_PX;
    const below = anchor.bottom + TOOLTIP_GAP_PX;
    const fitsBelow = below + tooltip.offsetHeight <= window.innerHeight - EDGE_MARGIN_PX;
    const top = fitsBelow ? below : anchor.top - TOOLTIP_GAP_PX - tooltip.offsetHeight;
    tooltip.style.left = `${Math.max(0, Math.min(anchor.left, maxLeft))}px`;
    tooltip.style.top = `${Math.max(0, top)}px`;
  };

  const showDocsAt = (point) => {
    const pos = cm.coordsChar(point, 'window');
    const line = cm.getLine(pos.line) || '';
    // Past the middle of a name's last letter the pointer maps to the position after it.
    const target = getApiPathAt(line, pos.ch) || getApiPathAt(line, pos.ch - 1);
    const token = target && cm.getTokenAt({ line: pos.line, ch: target.start + 1 });
    if (!target || NON_CODE_TOKENS.test(token?.type || '')) {
      hideTooltip();
      return;
    }

    const [entry] = findApiEntries(target.path, contexts);
    if (!entry) {
      hideTooltip();
    } else if (entry.path !== shownPath) {
      showTooltip(entry, cm.charCoords({ line: pos.line, ch: target.start }, 'window'));
    }
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
