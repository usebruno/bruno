export const focusAddressBar = () => {
  const requestUrlContainer = document.querySelector('#request-url');
  if (requestUrlContainer) {
    const codeMirrorElement = requestUrlContainer.querySelector('.CodeMirror');
    if (codeMirrorElement && codeMirrorElement.CodeMirror) {
      codeMirrorElement.CodeMirror.focus();
      codeMirrorElement.CodeMirror.execCommand('selectAll');
    }
  }
};
