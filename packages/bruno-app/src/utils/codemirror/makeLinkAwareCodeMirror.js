const CodeMirror = require('codemirror');
import LinkifyIt from 'linkify-it';
import { isMacOS } from 'utils/common/platform';

export default function makeLinkAwareCodeMirror(host, options = {}) {
  const cmdCtrlClass = 'cmd-ctrl-pressed';
  const linkClass = 'CodeMirror-link';
  const linkHoverClass = 'hovered-link';
  const linkHint = isMacOS() ? 'Hold Cmd and click to open link' : 'Hold Ctrl and click to open link';

  const isCmdOrCtrlPressed = (event) => (isMacOS() ? event.metaKey : event.ctrlKey);

  const editor = CodeMirror(host, {
    ...options,
    configureMouse: (cm, repeat, ev) => {
      if (isCmdOrCtrlPressed(ev) && ev.target?.classList.contains(linkClass)) {
        return { addNew: false }; // prevent multi-cursor on Cmd+click on links
      }
      return {};
    }
  });
  if (!editor) return editor;

  const linkify = new LinkifyIt();

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
  const debouncedMarkUrls = debounce(() => {
    requestAnimationFrame(markUrls);
  }, 150);

  function markUrls() {
    const doc = editor.getDoc();
    const text = doc.getValue();

    editor.getAllMarks().forEach((mark) => {
      if (mark.className === linkClass) mark.clear();
    });

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
  const handleMouseEnter = (e) => {
    const el = e.target;
    if (!el.classList.contains(linkClass)) return;
    updateCmdCtrlClass(e);

    el.classList.add(linkHoverClass);
    let sibling = el.previousElementSibling;
    while (sibling && sibling.classList.contains(linkClass)) {
      sibling.classList.add(linkHoverClass);
      sibling = sibling.previousElementSibling;
    }
    sibling = el.nextElementSibling;
    while (sibling && sibling.classList.contains(linkClass)) {
      sibling.classList.add(linkHoverClass);
      sibling = sibling.nextElementSibling;
    }
  };
  const handleMouseLeave = (e) => {
    const el = e.target;
    el.classList.remove(linkHoverClass);
    let sibling = el.previousElementSibling;
    while (sibling && sibling.classList.contains(linkClass)) {
      sibling.classList.remove(linkHoverClass);
      sibling = sibling.previousElementSibling;
    }
    sibling = el.nextElementSibling;
    while (sibling && sibling.classList.contains(linkClass)) {
      sibling.classList.remove(linkHoverClass);
      sibling = sibling.nextElementSibling;
    }
  };
  const editorWrapper = editor.getWrapperElement();

  function updateCmdCtrlClass(event) {
    if (isCmdOrCtrlPressed(event)) {
      editorWrapper.classList.add(cmdCtrlClass);
    } else {
      editorWrapper.classList.remove(cmdCtrlClass);
    }
  }

  function handleClick(event) {
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

  // Initial marking and event binding
  markUrls();
  editor.on('changes', debouncedMarkUrls);
  window.addEventListener('keydown', updateCmdCtrlClass);
  window.addEventListener('keyup', updateCmdCtrlClass);
  editorWrapper.addEventListener('click', handleClick);
  // Listen for mouseover to add hover effect
  editorWrapper.addEventListener('mouseover', handleMouseEnter);
  // Listen for mouseout to reset the hover effect
  editorWrapper.addEventListener('mouseout', handleMouseLeave);

  editor._destroyLinkAware = () => {
    editor.off('changes', debouncedMarkUrls);
    window.removeEventListener('keydown', updateCmdCtrlClass);
    window.removeEventListener('keyup', updateCmdCtrlClass);
    editorWrapper.removeEventListener('click', handleClick);
    editorWrapper.removeEventListener('mouseover', handleMouseEnter);
    editorWrapper.removeEventListener('mouseout', handleMouseLeave);
  };

  // Return editor instance
  return editor;
}
