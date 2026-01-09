import LinkifyIt from 'linkify-it';
import { isMacOS } from 'utils/common/platform';
import { debounce } from 'lodash';
/**
 * Gets the visible line range using scroll info and lineAtHeight
 * @param {Object} editor - The CodeMirror editor instance
 * @param {number} padding - Number of lines to add above and below viewport
 * @returns {Object} Object with from and to line numbers
 */
function getVisibleLineRange(editor, padding = 3) {
  const doc = editor.getDoc();
  const scroll = editor.getScrollInfo();
  const topLine = editor.lineAtHeight(scroll.top, 'local');
  const bottomLine = editor.lineAtHeight(scroll.top + scroll.clientHeight, 'local');

  return {
    from: Math.max(0, topLine - padding),
    to: Math.min(doc.lineCount(), bottomLine + padding + 1) // +1 because to is exclusive
  };
}

/**
 * Marks URLs in the CodeMirror editor with clickable link styling
 * Only processes links in the visible viewport for performance
 * @param {Object} editor - The CodeMirror editor instance
 * @param {Object} linkify - The LinkifyIt instance for URL detection
 * @param {string} linkClass - CSS class name for links
 * @param {string} linkHint - Tooltip text for links
 */
function markUrls(editor, linkify, linkClass, linkHint) {
  const doc = editor.getDoc();
  const { from: fromLine, to: toLine } = getVisibleLineRange(editor, 3);

  // Use editor.operation() to batch all mark operations for better performance
  editor.operation(() => {
    // Clear only link marks that overlap the visible range
    editor.getAllMarks().forEach((mark) => {
      if (mark.className !== linkClass) return;

      // Check if mark overlaps visible range
      const pos = mark.find?.();
      if (!pos) {
        // If we can't find position, clear it to be safe
        mark.clear();
        return;
      }

      // Clear marks that overlap the visible range
      if (pos.to.line >= fromLine && pos.from.line < toLine) {
        mark.clear();
      }
    });

    // Find and mark URLs in visible lines only
    for (let lineNum = fromLine; lineNum < toLine; lineNum++) {
      const lineContent = doc.getLine(lineNum);
      if (!lineContent) continue;

      const matches = linkify.match(lineContent);
      if (!matches) continue;

      const variablePatterns = [];
      const variablePattern = /\{\{[^}]*\}\}/g;
      let varMatch;
      while ((varMatch = variablePattern.exec(lineContent)) !== null) {
        variablePatterns.push({ start: varMatch.index, end: varMatch.index + varMatch[0].length });
      }
      matches.forEach(({ index, lastIndex, url }) => {
        const isInVariable = variablePatterns.some(
          ({ start, end }) => index < end && lastIndex > start
        );
        if (isInVariable) return;

        try {
          editor.markText(
            { line: lineNum, ch: index },
            { line: lineNum, ch: lastIndex },
            {
              className: linkClass,
              attributes: {
                'data-url': url,
                'title': linkHint
              }
            }
          );
        } catch (e) {
          // Silently ignore marking errors (e.g., if positions are invalid)
          // This can happen if the line content changed between getting it and marking
        }
      });
    }
  });
}

/**
 * Handles mouse enter events on links to show hover effects
 * @param {Event} event - The mouse enter event
 * @param {string} linkClass - CSS class name for links
 * @param {string} linkHoverClass - CSS class name for hovered links
 * @param {Function} updateCmdCtrlClass - Function to update Cmd/Ctrl state
 */
function handleMouseEnter(event, linkClass, linkHoverClass, updateCmdCtrlClass) {
  const el = event.target;
  if (!el.classList.contains(linkClass)) return;

  updateCmdCtrlClass(event);

  el.classList.add(linkHoverClass);

  // Add hover effect to previous siblings that are also links
  let sibling = el.previousElementSibling;
  while (sibling && sibling.classList.contains(linkClass)) {
    sibling.classList.add(linkHoverClass);
    sibling = sibling.previousElementSibling;
  }

  // Add hover effect to next siblings that are also links
  sibling = el.nextElementSibling;
  while (sibling && sibling.classList.contains(linkClass)) {
    sibling.classList.add(linkHoverClass);
    sibling = sibling.nextElementSibling;
  }
}

/**
 * Handles mouse leave events on links to remove hover effects
 * @param {Event} event - The mouse leave event
 * @param {string} linkClass - CSS class name for links
 * @param {string} linkHoverClass - CSS class name for hovered links
 */
function handleMouseLeave(event, linkClass, linkHoverClass) {
  const el = event.target;
  el.classList.remove(linkHoverClass);

  // Remove hover effect from previous siblings that are also links
  let sibling = el.previousElementSibling;
  while (sibling && sibling.classList.contains(linkClass)) {
    sibling.classList.remove(linkHoverClass);
    sibling = sibling.previousElementSibling;
  }

  // Remove hover effect from next siblings that are also links
  sibling = el.nextElementSibling;
  while (sibling && sibling.classList.contains(linkClass)) {
    sibling.classList.remove(linkHoverClass);
    sibling = sibling.nextElementSibling;
  }
}

/**
 * Updates the CSS class on the editor wrapper based on Cmd/Ctrl key state
 * @param {Event} event - The keyboard event
 * @param {HTMLElement} editorWrapper - The editor wrapper element
 * @param {string} cmdCtrlClass - CSS class name for Cmd/Ctrl pressed state
 * @param {Function} isCmdOrCtrlPressed - Function to check if Cmd/Ctrl is pressed
 */
function updateCmdCtrlClass(event, editorWrapper, cmdCtrlClass, isCmdOrCtrlPressed) {
  if (isCmdOrCtrlPressed(event)) {
    editorWrapper.classList.add(cmdCtrlClass);
  } else {
    editorWrapper.classList.remove(cmdCtrlClass);
  }
}

/**
 * Handles click events on links to open them externally
 * @param {Event} event - The click event
 * @param {string} linkClass - CSS class name for links
 * @param {Function} isCmdOrCtrlPressed - Function to check if Cmd/Ctrl is pressed
 */
function handleClick(event, linkClass, isCmdOrCtrlPressed) {
  if (!isCmdOrCtrlPressed(event)) return;

  if (event.target.classList.contains(linkClass)) {
    event.preventDefault();
    event.stopPropagation();
    const url = event.target.getAttribute('data-url');
    if (url) {
      window?.ipcRenderer?.openExternal(url);
    }
  }
}

/**
 * Sets up link awareness for a CodeMirror editor instance.
 * This enables automatic URL detection, styling, and click-to-open functionality.
 * @param {Object} editor - The CodeMirror editor instance
 * @param {Object} options - Configuration options (currently unused but reserved for future use)
 * @returns {void}
 */
function setupLinkAware(editor, options = {}) {
  if (!editor) {
    return;
  }

  // CSS class names and configuration
  const cmdCtrlClass = 'cmd-ctrl-pressed';
  const linkClass = 'CodeMirror-link';
  const linkHoverClass = 'hovered-link';
  const linkHint = isMacOS() ? 'Hold Cmd and click to open link' : 'Hold Ctrl and click to open link';

  // Helper function to check if Cmd/Ctrl is pressed
  const isCmdOrCtrlPressed = (event) => (isMacOS() ? event.metaKey : event.ctrlKey);

  // Initialize LinkifyIt for URL detection
  const linkify = new LinkifyIt();
  const editorWrapper = editor.getWrapperElement();

  // Create bound versions of event handlers with proper parameters
  const boundMarkUrls = () => markUrls(editor, linkify, linkClass, linkHint);
  const boundUpdateCmdCtrlClass = (event) => updateCmdCtrlClass(event, editorWrapper, cmdCtrlClass, isCmdOrCtrlPressed);
  const boundHandleClick = (event) => handleClick(event, linkClass, isCmdOrCtrlPressed);
  const boundHandleMouseEnter = (event) => handleMouseEnter(event, linkClass, linkHoverClass, boundUpdateCmdCtrlClass);
  const boundHandleMouseLeave = (event) => handleMouseLeave(event, linkClass, linkHoverClass);

  // Create debounced version of markUrls that runs after rendering
  const debouncedMarkUrls = debounce(() => {
    requestAnimationFrame(() => {
      // Skip if the editor is hidden (e.g., tab not visible)
      if (!editorWrapper.offsetParent) return;
      boundMarkUrls();
    });
  }, 150);

  // Run after the first render/refresh
  editor.on('refresh', debouncedMarkUrls);

  // Set up event listeners
  editor.on('changes', debouncedMarkUrls);

  // Listen for scroll events to update marks when viewport changes
  editor.on('scroll', debouncedMarkUrls);

  window.addEventListener('keydown', boundUpdateCmdCtrlClass);
  window.addEventListener('keyup', boundUpdateCmdCtrlClass);
  editorWrapper.addEventListener('click', boundHandleClick);
  editorWrapper.addEventListener('mouseover', boundHandleMouseEnter);
  editorWrapper.addEventListener('mouseout', boundHandleMouseLeave);

  // Cleanup function to remove all event listeners
  editor._destroyLinkAware = () => {
    editor.off('refresh', debouncedMarkUrls);
    editor.off('changes', debouncedMarkUrls);
    editor.off('scroll', debouncedMarkUrls);
    window.removeEventListener('keydown', boundUpdateCmdCtrlClass);
    window.removeEventListener('keyup', boundUpdateCmdCtrlClass);
    editorWrapper.removeEventListener('click', boundHandleClick);
    editorWrapper.removeEventListener('mouseover', boundHandleMouseEnter);
    editorWrapper.removeEventListener('mouseout', boundHandleMouseLeave);
  };
}

export { setupLinkAware };
