/**
 * Utility functions for handling clickable links in CodeMirror
 */

import { isValidUrl } from 'utils/url/index';

/**
 * Regular expression to match URLs in text
 * Supports http, https, ftp, and other common protocols
 */
export const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+|ftp:\/\/[^\s<>"{}|\\^`[\]]+|www\.[^\s<>"{}|\\^`[\]]+)/gi;

/**
 * Check if a given text contains URLs
 * @param {string} text - The text to check
 * @returns {boolean} - True if text contains URLs
 */
export const containsUrls = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }

  URL_REGEX.lastIndex = 0; // Reset regex state
  return URL_REGEX.test(text);
};

/**
 * Extract all URLs from text
 * @param {string} text - The text to extract URLs from
 * @returns {Array} - Array of URL objects with text, url, start, and end positions
 */
export const extractUrls = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const urls = [];
  let match;

  URL_REGEX.lastIndex = 0; // Reset regex state

  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0];
    const start = match.index;
    const end = start + url.length;

    // Normalize URL (add protocol if missing)
    let normalizedUrl = url;
    if (!url.match(/^https?:\/\//i) && !url.match(/^ftp:\/\//i)) {
      normalizedUrl = `https://${url}`;
    }

    // Validate the URL
    if (isValidUrl(normalizedUrl)) {
      urls.push({
        text: url,
        url: normalizedUrl,
        start,
        end
      });
    }
  }

  return urls;
};

/**
 * Handle click event on CodeMirror editor to detect URL clicks
 * @param {Object} cm - CodeMirror instance
 * @param {Event} event - Mouse event
 * @returns {boolean} - True if a URL was clicked and handled
 */
export const handleCodeMirrorClick = (cm, event) => {
  const pos = cm.coordsChar({ top: event.clientY, left: event.clientX });
  const line = cm.getLine(pos.line);

  if (!line) {
    return false;
  }

  // Extract URLs from the line
  const urls = extractUrls(line);

  // Find the URL that contains the clicked position
  const clickedUrl = urls.find((url) => {
    return pos.ch >= url.start && pos.ch <= url.end;
  });

  if (clickedUrl) {
    // Open URL in external browser
    openExternalUrl(clickedUrl.url);
    return true;
  }

  return false;
};

/**
 * Open URL in external browser
 * @param {string} url - The URL to open
 */
export const openExternalUrl = (url) => {
  if (!url || !isValidUrl(url)) {
    console.warn('Invalid URL provided:', url);
    return;
  }

  try {
    // Use window.open for web context (Bruno app)
    if (typeof window !== 'undefined' && window.open) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('Unable to open external URL:', url);
    }
  } catch (error) {
    console.error('Error opening external URL:', error);
  }
};

/**
 * Add clickable link functionality to CodeMirror editor
 * @param {Object} cm - CodeMirror instance
 * @returns {Function} - Cleanup function to remove event listeners
 */
export const addClickableLinksToCodeMirror = (cm) => {
  if (!cm) {
    return () => {};
  }

  const clickHandler = (cm, event) => {
    // Only handle left mouse button clicks
    if (event.button !== 0) {
      return;
    }

    // Check if a URL was clicked
    const handled = handleCodeMirrorClick(cm, event);

    if (handled) {
      // Prevent default behavior and stop propagation
      event.preventDefault();
      event.stopPropagation();
    }
  };

  // Add click event listener, but only handle Cmd/Ctrl+Click (Meta/Ctrl key down)
  const metaClickHandler = (cm, event) => {
    // Only handle left mouse button clicks with Cmd (on Mac) or Ctrl (on Windows/Linux)
    const isMetaOrCtrl = event.metaKey || event.ctrlKey;
    if (event.button !== 0 || !isMetaOrCtrl) {
      return;
    }

    // Check if a URL was clicked
    const handled = handleCodeMirrorClick(cm, event);

    if (handled) {
      // Prevent default behavior and stop propagation
      event.preventDefault();
      event.stopPropagation();
    }
  };

  cm.on('mousedown', metaClickHandler);

  // Return cleanup function
  return () => {
    cm.off('mousedown', clickHandler);
  };
};

/**
 * Add visual styling for URLs in CodeMirror
 * @param {Object} cm - CodeMirror instance
 * @returns {Function} - Cleanup function to remove overlay
 */
export const addUrlStylingToCodeMirror = (cm) => {
  if (!cm) {
    return () => {};
  }

  const overlay = {
    token: (stream) => {
      const line = stream.string;
      const pos = stream.pos;

      // Extract URLs from the current line
      const urls = extractUrls(line);

      // Check if current position is within a URL
      const urlAtPos = urls.find((url) => {
        return pos >= url.start && pos < url.end;
      });

      if (urlAtPos) {
        // Skip to the end of the URL
        stream.pos = urlAtPos.end;
        return 'link';
      }

      // Move to next character
      stream.next();
      return null;
    }
  };

  // Add overlay
  cm.addOverlay(overlay);

  // Return cleanup function
  return () => {
    cm.removeOverlay(overlay);
  };
};

/**
 * Add hover tooltip for links in CodeMirror
 * @param {Object} cm - CodeMirror instance
 * @returns {Function} - Cleanup function to remove event listeners and tooltip
 */
export const addLinkHoverTooltipToCodeMirror = (cm) => {
  if (!cm) return () => {};

  let tooltipEl = null;
  let lastMousePos = null;
  let hoverTimeout = null;

  function createTooltip(clientX, clientY) {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.style.position = 'fixed';
      tooltipEl.style.zIndex = 9999;
      tooltipEl.style.pointerEvents = 'none';
      tooltipEl.style.background = 'rgba(30, 30, 30, 0.97)';
      tooltipEl.style.border = '1px solid #ffffff';
      tooltipEl.style.color = '#fff';
      tooltipEl.style.padding = '6px 10px';
      tooltipEl.style.borderRadius = '5px';
      tooltipEl.style.fontSize = '12px';
      tooltipEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      tooltipEl.style.transition = 'opacity 0.15s';
      tooltipEl.style.opacity = '0';
      tooltipEl.style.whiteSpace = 'nowrap';
      tooltipEl.textContent = 'Hold Cmd (Mac) or Ctrl and click to open link';

      document.body.appendChild(tooltipEl);
      // Allow transition to trigger
      setTimeout(() => {
        tooltipEl && (tooltipEl.style.opacity = '1');
      }, 10);

      // Position tooltip
      setTooltipPosition(clientX, clientY);
    }
  }

  function destroyTooltip() {
    if (tooltipEl && tooltipEl.parentNode) {
      tooltipEl.style.opacity = '0';
      setTimeout(() => {
        tooltipEl && tooltipEl.parentNode && tooltipEl.parentNode.removeChild(tooltipEl);
        tooltipEl = null;
      }, 150);
    }
  }

  function setTooltipPosition(x, y) {
    if (tooltipEl) {
      // Small offset from pointer
      let dx = 16, dy = 14;
      tooltipEl.style.left = `${x + dx}px`;
      tooltipEl.style.top = `${y + dy}px`;
    }
  }

  function onMouseMove(e) {
    lastMousePos = { clientX: e.clientX, clientY: e.clientY };
    // Find CodeMirror position
    let { left, top } = cm.getWrapperElement().getBoundingClientRect();
    let x = e.clientX - left, y = e.clientY - top;
    let pos = cm.coordsChar({ left: e.clientX, top: e.clientY });

    // Get token at position
    let token = cm.getTokenAt(pos);

    // Current line string
    let lineStr = (cm.getLine && typeof pos.line === 'number') ? cm.getLine(pos.line) : '';
    let linkAtPos = null;

    // Try extractUrls for the current line, if available
    if (lineStr) {
      const urls = extractUrls(lineStr);
      linkAtPos = urls.find((u) => pos.ch >= u.start && pos.ch < u.end);
    } else if (token && token.type === 'link') {
      linkAtPos = { url: token.string };
    }

    if (linkAtPos) {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      if (!tooltipEl) {
        hoverTimeout = setTimeout(() => {
          createTooltip(e.clientX, e.clientY);
        }, 250); // delay to avoid flashing
      } else {
        setTooltipPosition(e.clientX, e.clientY);
      }
    } else {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      destroyTooltip();
    }
  }

  function onMouseLeave() {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    destroyTooltip();
  }

  cm.getWrapperElement().addEventListener('mousemove', onMouseMove);
  cm.getWrapperElement().addEventListener('mouseleave', onMouseLeave);

  // Also remove tooltip on scroll or text change (optional but improves UX)
  cm.on('scroll', destroyTooltip);
  cm.on('cursorActivity', destroyTooltip);

  // Cleanup
  return () => {
    cm.getWrapperElement().removeEventListener('mousemove', onMouseMove);
    cm.getWrapperElement().removeEventListener('mouseleave', onMouseLeave);
    cm.off('scroll', destroyTooltip);
    cm.off('cursorActivity', destroyTooltip);
    destroyTooltip();
  };
};
