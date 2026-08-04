import { renderVarInfo } from 'utils/codemirror/brunoVarInfo';

const HIDE_DELAY_MS = 500;
const EDGE_MARGIN_REM = 0.5;
const GAP_REM = 0.3125;

// One popup across all VariableValue cells. Without a shared handle, focusing the
// editable input keeps popup A while hovering another {{var}} mounts popup B on top.
let sharedVarInfoPopup = null;

const cleanupPopup = (popup) => {
  if (!popup) return;
  if (typeof popup._cleanup === 'function') {
    popup._cleanup();
  } else if (popup.parentNode) {
    popup.parentNode.removeChild(popup);
  }
  if (sharedVarInfoPopup === popup) sharedVarInfoPopup = null;
  if (popup._ownerRef?.current === popup) popup._ownerRef.current = null;
};

export const hideActivePopup = (popupRef) => {
  const popup = popupRef?.current;
  if (!popup) return;
  cleanupPopup(popup);
  popupRef.current = null;
};

export const showVarInfoPopup = ({ box, tokenString, options, popupRef, clearHoverTimers }) => {
  cleanupPopup(sharedVarInfoPopup);
  clearHoverTimers?.();

  const content = renderVarInfo({ string: tokenString }, options);
  if (!content) return;

  const popup = document.createElement('div');
  popup.className = 'CodeMirror-brunoVarInfo';
  popup.setAttribute('data-testid', 'var-info-popup');
  popup.appendChild(content);
  document.body.appendChild(popup);
  popupRef.current = popup;
  popup._ownerRef = popupRef;
  sharedVarInfoPopup = popup;

  const popupBox = popup.getBoundingClientRect();
  const popupStyle = window.getComputedStyle(popup);
  const popupWidth
    = popupBox.width + parseFloat(popupStyle.marginLeft) + parseFloat(popupStyle.marginRight);
  const popupHeight
    = popupBox.height + parseFloat(popupStyle.marginTop) + parseFloat(popupStyle.marginBottom);

  let topPos = box.bottom + GAP_REM * 16;
  if (popupHeight > window.innerHeight - box.bottom - EDGE_MARGIN_REM * 16 && box.top > window.innerHeight - box.bottom) {
    topPos = box.top - popupHeight - GAP_REM * 16;
  }
  if (topPos < EDGE_MARGIN_REM * 16) {
    topPos = EDGE_MARGIN_REM * 16;
  }

  let leftPos = box.left;
  if (leftPos + popupWidth > window.innerWidth - EDGE_MARGIN_REM * 16) {
    leftPos = window.innerWidth - popupWidth - EDGE_MARGIN_REM * 16;
  }
  if (leftPos < EDGE_MARGIN_REM * 16) {
    leftPos = EDGE_MARGIN_REM * 16;
  }

  popup.style.opacity = '1';
  popup.style.top = `${topPos / 16}rem`;
  popup.style.left = `${leftPos / 16}rem`;

  let hideTimeout;
  let cleanedUp = false;

  const scheduleHide = () => {
    if (popup.contains(document.activeElement)) return;
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => hideActivePopup(popupRef), HIDE_DELAY_MS);
  };

  const cancelHide = () => {
    clearTimeout(hideTimeout);
    clearHoverTimers?.();
  };

  const onDocumentClick = (e) => {
    if (!popup.contains(e.target)) {
      hideActivePopup(popupRef);
    }
  };

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearTimeout(hideTimeout);
    popup.removeEventListener('mouseenter', cancelHide);
    popup.removeEventListener('mouseleave', scheduleHide);
    document.removeEventListener('mousedown', onDocumentClick);
    if (popup.parentNode) {
      popup.parentNode.removeChild(popup);
    }
    if (sharedVarInfoPopup === popup) sharedVarInfoPopup = null;
    if (popup._ownerRef?.current === popup) popup._ownerRef.current = null;
  };

  popup._cleanup = cleanup;
  popup.addEventListener('mouseenter', cancelHide);
  popup.addEventListener('mouseleave', scheduleHide);
  document.addEventListener('mousedown', onDocumentClick);
};
