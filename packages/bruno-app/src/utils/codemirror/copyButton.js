import { COPY_SUCCESS_TIMEOUT } from 'utils/common/constants';
import { CHECKMARK_ICON_SVG_TEXT, COPY_ICON_SVG_TEXT } from 'utils/codemirror/scopeIcons';

/**
 * A button that copies text to the clipboard and shows a checkmark for a moment after. A mousedown
 * on it is cancelled, so the editor keeps focus and a popup that closes on blur stays open.
 * @param {() => string} getText - Read at click time, so the button copies the latest text
 * @param {Object} [options]
 * @param {string} [options.testId]
 * @param {() => void} [options.onCopy] - Called once the text is on the clipboard
 * @returns {HTMLButtonElement}
 */
export const createCopyButton = (getText, { testId, onCopy } = {}) => {
  const copyButton = document.createElement('button');
  copyButton.className = 'copy-button';
  copyButton.type = 'button';
  copyButton.setAttribute('aria-label', 'Copy');
  copyButton.innerHTML = COPY_ICON_SVG_TEXT;
  if (testId) copyButton.setAttribute('data-testid', testId);

  let isCopied = false;

  copyButton.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  copyButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isCopied) return;

    navigator.clipboard
      .writeText(getText())
      .then(() => {
        isCopied = true;
        copyButton.innerHTML = CHECKMARK_ICON_SVG_TEXT;
        copyButton.classList.add('copy-success');

        setTimeout(() => {
          isCopied = false;
          copyButton.innerHTML = COPY_ICON_SVG_TEXT;
          copyButton.classList.remove('copy-success');
        }, COPY_SUCCESS_TIMEOUT);

        onCopy?.();
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err.message);
      });
  });

  return copyButton;
};
