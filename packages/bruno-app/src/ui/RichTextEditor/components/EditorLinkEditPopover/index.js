import React, { useState, useEffect, useRef } from 'react';
import Button from 'ui/Button';
import { IconEdit, IconUnlink, IconCopy } from '@tabler/icons';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const EditorLinkEditPopover = ({ editor, isOpen, onClose, onSubmit, onUnlink, initialText, initialUrl, externalCoords }) => {
  const [text, setText] = useState(initialText || '');
  const [url, setUrl] = useState(initialUrl || '');
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const popoverRef = useRef(null);
  const urlInputRef = useRef(null);

  useEffect(() => {
    setText(initialText || '');
    setUrl(initialUrl || '');
  }, [initialText, initialUrl]);

  // Focus the URL input without scrolling the page.
  // We can't use autoFocus because the popover is position:absolute inside a
  // scrollable container — autoFocus triggers native scroll-into-view.
  useEffect(() => {
    if (isOpen && urlInputRef.current) {
      const timer = setTimeout(() => {
        urlInputRef.current?.focus({ preventScroll: true });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    // Parent provides coords which are relative to the editor container
    if (!isOpen) return;

    if (externalCoords) {
      setCoords(externalCoords);
    }
  }, [isOpen, externalCoords]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      // Small delay to prevent immediate close if opened via click
      setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 10);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleConfirm = () => {
    if (!url) return;
    onSubmit({ text, url });
    onClose();
  };

  const handleUnlink = () => {
    if (onUnlink) {
      onUnlink();
    }
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
      ref={popoverRef}
      data-editor-link-popover="true"
      style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
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
          >
            {initialUrl ? 'Save' : 'Insert'}
          </Button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default EditorLinkEditPopover;
