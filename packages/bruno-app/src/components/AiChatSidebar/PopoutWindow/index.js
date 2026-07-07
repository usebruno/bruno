import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { StyleSheetManager } from 'styled-components';

// Must match the frameName prefix allow-listed in bruno-electron's
// setWindowOpenHandler, any other window.open is denied there. Each open
// gets a unique suffix so a remount (e.g. StrictMode's dev double-effect)
// never receives a handle to the previous, already-closing named window.
export const AI_POPOUT_WINDOW_NAME_PREFIX = 'bruno-ai-assistant';
let popoutSeq = 0;

// Copy every stylesheet already loaded in the main window into the popout
// document. We read cssRules instead of cloning the <style> nodes because
// styled-components in production injects rules through the CSSOM, leaving
// the backing <style> tags empty.
const copyStyles = (sourceDoc, targetDoc) => {
  for (const sheet of Array.from(sourceDoc.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n');
      const styleEl = targetDoc.createElement('style');
      styleEl.textContent = css;
      targetDoc.head.appendChild(styleEl);
    } catch (err) {
      // cssRules throws for sheets Chromium treats as cross-origin (e.g.
      // file:// <link>s in packaged builds) fall back to a link with the
      // resolved absolute URL, since about:blank can't resolve relative ones.
      if (sheet.href) {
        const linkEl = targetDoc.createElement('link');
        linkEl.rel = 'stylesheet';
        linkEl.href = sheet.href;
        targetDoc.head.appendChild(linkEl);
      } else if (sheet.ownerNode) {
        targetDoc.head.appendChild(targetDoc.importNode(sheet.ownerNode, true));
      }
    }
  }
};

const PopoutWindow = ({ title, width = 480, height = 640, onClose, children }) => {
  const [container, setContainer] = useState(null);
  const closedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const win = window.open('', `${AI_POPOUT_WINDOW_NAME_PREFIX}-${++popoutSeq}`, `popup=yes,width=${width},height=${height}`);
    if (!win) {
      onCloseRef.current?.({ blocked: true });
      return undefined;
    }

    const doc = win.document;
    doc.title = title;
    copyStyles(document, doc);
    // Mirror the theme classes ('light'/'dark' live on <html>) so any
    // selectors keyed on them keep working in the popout.
    doc.documentElement.className = document.documentElement.className;
    doc.body.className = document.body.className;
    doc.documentElement.style.height = '100%';
    doc.body.style.height = '100%';
    doc.body.style.margin = '0';
    // Safety net if a stylesheet couldn't be copied: inherit the app's base
    // typography and background so the popout never renders unstyled-white.
    const baseStyle = window.getComputedStyle(document.body);
    doc.body.style.fontFamily = baseStyle.fontFamily;
    doc.body.style.fontSize = baseStyle.fontSize;
    doc.body.style.color = baseStyle.color;
    doc.body.style.backgroundColor = baseStyle.backgroundColor;

    const mount = doc.createElement('div');
    mount.style.height = '100%';
    doc.body.appendChild(mount);

    // Detect the user closing the OS window by polling win.closed. Don't use
    // pagehide/unload — Electron fires them on the initial about:blank
    // document right after window.open, which would close the chat instantly.
    const pollTimer = setInterval(() => {
      if (!win.closed) return;
      clearInterval(pollTimer);
      if (closedRef.current) return;
      closedRef.current = true;
      onCloseRef.current?.({ blocked: false });
    }, 300);

    // Closing an already-user-closed window throws "IPC method called after
    // context was released" in Electron — always check/catch.
    const safeCloseChild = () => {
      closedRef.current = true;
      try {
        if (!win.closed) win.close();
      } catch (err) {
        // window context already gone
      }
    };

    // If the main window reloads, React cleanup never runs — close the child
    // explicitly so it isn't orphaned.
    window.addEventListener('beforeunload', safeCloseChild);

    win.focus();
    setContainer(mount);

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('beforeunload', safeCloseChild);
      safeCloseChild();
    };
  }, []);

  if (!container) return null;

  return createPortal(
    <StyleSheetManager target={container.ownerDocument.head}>{children}</StyleSheetManager>,
    container
  );
};

export default PopoutWindow;
