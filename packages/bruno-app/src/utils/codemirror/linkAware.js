import LinkifyIt from 'linkify-it';
import { isMacOS } from 'utils/common/platform';

/**
 * Creates a debounced version of a function that delays execution until after
 * the specified delay has passed since the last time it was invoked.
 * @param {Function} fn - The function to debounce
 * @param {number} delay - The delay in milliseconds
 * @returns {Function} The debounced function
 */
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Marks URLs in the CodeMirror editor with clickable link styling
 * @param {Object} editor - The CodeMirror editor instance
 * @param {Object} linkify - The LinkifyIt instance for URL detection
 * @param {string} linkClass - CSS class name for links
 * @param {string} linkHint - Tooltip text for links
 */
function markUrls(editor, linkify, linkClass, linkHint) {
  const doc = editor.getDoc();
  const text = doc.getValue();

  // Clear existing link marks
  editor.getAllMarks().forEach((mark) => {
    if (mark.className === linkClass) mark.clear();
  });

  // Find and mark new URLs
  const matches = linkify.match(text);
  matches?.forEach(({ index, lastIndex, url }) => {
    const from = editor.posFromIndex(index);
    const to = editor.posFromIndex(lastIndex);
    editor.markText(from, to, {
      className: linkClass,
      attributes: {
        'data-url': url,
        title: linkHint
      }
    });
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

  // Create debounced version of markUrls
  const debouncedMarkUrls = debounce(() => {
    requestAnimationFrame(boundMarkUrls);
  }, 150);

  // Initial URL marking
  boundMarkUrls();

  // Set up event listeners
  editor.on('changes', debouncedMarkUrls);
  window.addEventListener('keydown', boundUpdateCmdCtrlClass);
  window.addEventListener('keyup', boundUpdateCmdCtrlClass);
  editorWrapper.addEventListener('click', boundHandleClick);
  editorWrapper.addEventListener('mouseover', boundHandleMouseEnter);
  editorWrapper.addEventListener('mouseout', boundHandleMouseLeave);

  // Cleanup function to remove all event listeners
  editor._destroyLinkAware = () => {
    editor.off('changes', debouncedMarkUrls);
    window.removeEventListener('keydown', boundUpdateCmdCtrlClass);
    window.removeEventListener('keyup', boundUpdateCmdCtrlClass);
    editorWrapper.removeEventListener('click', boundHandleClick);
    editorWrapper.removeEventListener('mouseover', boundHandleMouseEnter);
    editorWrapper.removeEventListener('mouseout', boundHandleMouseLeave);
  };
}

export { setupLinkAware };
