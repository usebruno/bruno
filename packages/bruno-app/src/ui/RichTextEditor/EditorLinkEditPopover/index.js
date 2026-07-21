import React, { useState, useEffect, useRef } from 'react';
import Button from 'ui/Button';
import { IconEdit, IconUnlink, IconCopy } from '@tabler/icons';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const EditorLinkEditPopover = ({ editor, isOpen, onClose, onSubmit, onUnlink, initialText, initialUrl, mode = 'edit', isEditable = true, onPopoverMouseEnter, onPopoverMouseLeave, externalCoords }) => {
  const [currentMode, setCurrentMode] = useState(mode);
  const [text, setText] = useState(initialText || '');
  const [url, setUrl] = useState(initialUrl || '');
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const popoverRef = useRef(null);
  const urlInputRef = useRef(null);

  useEffect(() => {
    setText(initialText || '');
    setUrl(initialUrl || '');
    setCurrentMode(mode);
  }, [initialText, initialUrl, mode]);

  // Focus the URL input without scrolling the page.
  // We can't use autoFocus because the popover is position:absolute inside a
  // scrollable container — autoFocus triggers native scroll-into-view.
  useEffect(() => {
    if (isOpen && currentMode === 'edit' && urlInputRef.current) {
      // Use a short timeout so the element is fully laid out before focusing
      const timer = setTimeout(() => {
        urlInputRef.current?.focus({ preventScroll: true });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentMode]);

  useEffect(() => {
    // If parent provides coords (e.g. from hover-element position), use those directly.
    // Otherwise fall back to calculating from editor cursor position.
    if (!isOpen) return;

    if (externalCoords) {
      setCoords(externalCoords);
      return;
    }

    if (editor) {
      try {
        const { from } = editor.state.selection;
        const posCoords = editor.view.coordsAtPos(from);
        setCoords({
          top: posCoords.bottom + 8,
          left: Math.max(10, posCoords.left)
        });
      } catch (err) {
        setCoords({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 150 });
      }
    }
  }, [isOpen, editor, externalCoords]);

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

  const handleCopy = () => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
      onClose();
    }
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
      onMouseEnter={onPopoverMouseEnter}
      onMouseLeave={onPopoverMouseLeave}
    >
      {currentMode === 'view' ? (
        <div className="editor-link-view">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="link-url"
            title={url}
          >
            {url}
          </a>
          <div className="view-separator" />
          <div className="action-icons">
            {isEditable && (
              <button
                type="button"
                className="action-icon-btn"
                onClick={() => setCurrentMode('edit')}
                title="Edit Link"
              >
                <IconEdit size={15} strokeWidth={1.5} />
              </button>
            )}
            {isEditable && (
              <button
                type="button"
                className="action-icon-btn"
                onClick={handleUnlink}
                title="Remove Link"
              >
                <IconUnlink size={15} strokeWidth={1.5} />
              </button>
            )}
            <button
              type="button"
              className="action-icon-btn"
              onClick={handleCopy}
              title="Copy Link"
            >
              <IconCopy size={15} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ) : (
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
      )}
    </StyledWrapper>
  );
};

export default EditorLinkEditPopover;
