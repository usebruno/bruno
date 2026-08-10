import React, { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const EditorLinkEditPopover = forwardRef(({ isOpen, onClose, onSubmit, initialText, initialUrl }, ref) => {
  const [text, setText] = useState(initialText || '');
  const [url, setUrl] = useState(initialUrl || '');
  const popoverRef = useRef(null);
  const urlInputRef = useRef(null);

  const setPopoverRefs = useCallback((node) => {
    popoverRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }, [ref]);

  // Re-seed on every open transition, not just when the link identity changes —
  // otherwise reopening on the same link shows a previously abandoned draft edit.
  // Adjusted during render (rather than an effect) so the reset lands in the
  // same render as the isOpen change.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setText(initialText || '');
      setUrl(initialUrl || '');
    }
  }

  // Focus the URL input without scrolling the page.
  // We can't use autoFocus because the popover is rendered via a Portal with
  // position:fixed — autoFocus triggers native scroll-into-view regardless.
  useEffect(() => {
    if (isOpen && urlInputRef.current) {
      const timer = setTimeout(() => {
        urlInputRef.current?.focus({ preventScroll: true });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    let timerId;
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      // Small delay to prevent immediate close if opened via click
      timerId = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 10);
    }
    return () => {
      if (timerId) clearTimeout(timerId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleConfirm = () => {
    if (!url.trim()) return;
    onSubmit({ text, url: url.trim() });
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <StyledWrapper
      ref={setPopoverRefs}
      data-editor-link-popover="true"
      onKeyDown={handleKeyDown}
    >
      <div data-testid="editor-link-popover" className="editor-link-popover-content">
        <div>
          <label htmlFor="linkText">Text</label>
          <input
            id="linkText"
            type="text"
            className="popover-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Text to display"
            autoComplete="off"
            spellCheck="false"
          />
        </div>
        <div>
          <label htmlFor="linkUrl">URL</label>
          <input
            id="linkUrl"
            ref={urlInputRef}
            type="text"
            className="popover-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            autoComplete="off"
            spellCheck="false"
          />
        </div>
        <div className="popover-actions">
          <Button
            type="button"
            color="secondary"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            color="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={!url.trim()}
          >
            {initialUrl ? 'Save' : 'Insert'}
          </Button>
        </div>
      </div>
    </StyledWrapper>
  );
});

export default EditorLinkEditPopover;
