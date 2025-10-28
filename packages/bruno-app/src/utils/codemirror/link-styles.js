/**
 * CSS styles for clickable links in CodeMirror
 */

export const linkStyles = `
  .CodeMirror .cm-link {
    text-decoration: underline;
    cursor: pointer;
    position: relative;
  }
`;

/**
 * Inject link styles into the document
 */
export const injectLinkStyles = () => {
  // Check if styles are already injected
  if (document.getElementById('codemirror-link-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'codemirror-link-styles';
  style.textContent = linkStyles;
  document.head.appendChild(style);
};
