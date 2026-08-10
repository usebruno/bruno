import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getMarkRange } from '@tiptap/core';
import { IconEdit, IconUnlink, IconCopy } from '@tabler/icons';
import toast from 'react-hot-toast';
import ToolHint from 'components/ToolHint';
import { isSafeUrl } from 'utils/url/index';
import EditorLinkEditPopover from '../EditorLinkEditPopover';
import StyledWrapper from './StyledWrapper';
import Portal from 'components/Portal/index';

const POPOVER_WIDTH = 272; // matches the popover's `width: 17rem` in StyledWrapper.js
const EDIT_POPOVER_HEIGHT = 180;
const HOVER_POPOVER_HEIGHT = 45;

/**
 * Resolves link text + doc range from the TipTap document for a given anchor element.
 */
function resolveLinkText(editor, anchorEl) {
  try {
    const pos = editor.view.posAtDOM(anchorEl, 0);
    if (pos != null) {
      const linkMarkType = editor.schema.marks.link;
      const $pos = editor.state.doc.resolve(pos);
      const range = getMarkRange($pos, linkMarkType);
      if (range) {
        return { text: editor.state.doc.textBetween(range.from, range.to, ' '), range };
      }
    }
  } catch (e) {
    // ignore
  }
  return { text: anchorEl.textContent || '', range: null };
}

/**
 * Gets coordinates for fixed positioning relative to viewport.
 * Flips the popover above the anchor if there is not enough space at the bottom.
 * Determines visibility based on whether the anchor is within the container bounds.
 */
function getPortalCoords(anchorRect, isEdit, containerRect) {
  const isVisible = containerRect
    ? !(
        anchorRect.bottom < containerRect.top
        || anchorRect.top > containerRect.bottom
        || anchorRect.right < containerRect.left
        || anchorRect.left > containerRect.right
      )
    : true;

  const left = Math.min(
    Math.max(8, anchorRect.left), // 8px left padding
    window.innerWidth - POPOVER_WIDTH - 8 // 8px right padding
  );

  const popoverHeight = isEdit ? EDIT_POPOVER_HEIGHT : HOVER_POPOVER_HEIGHT;

  // Try bottom first
  let top = anchorRect.bottom + 4;

  // If it overflows the bottom of the viewport and there is space above, place it above
  if (top + popoverHeight > window.innerHeight && anchorRect.top - popoverHeight - 4 > 0) {
    top = anchorRect.top - popoverHeight - 4;
  }

  return { top, left, visible: isVisible };
}

/**
 * EditorLinkPopover manages:
 * 1. A lightweight hover preview that appears in BOTH edit and preview modes.
 * 2. A full edit popover (edit-mode) triggered only in edit mode.
 *
 * Both are rendered INSIDE the editor's scrollable container (not a Portal),
 * so they naturally scroll with the content.
 */
const EditorLinkPopover = ({ editor, onSubmit, onUnlink, containerEl }) => {
  // --- Hover View Popover ---
  const [hoverOpen, setHoverOpen] = useState(false);
  const [hoverCoords, setHoverCoords] = useState({ top: 0, left: 0 });
  const [hoverLink, setHoverLink] = useState({ text: '', url: '' });

  // --- Edit Popover ---
  const [editOpen, setEditOpen] = useState(false);
  const [editCoords, setEditCoords] = useState({ top: 0, left: 0 });
  const [editLink, setEditLink] = useState({ text: '', url: '' });

  const hoverTimerRef = useRef(null);
  const isPointerOverHoverPopover = useRef(false);
  const currentAnchorRef = useRef(null);

  const [isEditable, setIsEditable] = useState(editor?.isEditable ?? false);

  useEffect(() => {
    if (!editor) return;
    setIsEditable(editor.isEditable);
    const handleTransaction = () => setIsEditable(editor.isEditable);
    editor.on('transaction', handleTransaction);
    return () => editor.off('transaction', handleTransaction);
  }, [editor]);

  const getContainer = useCallback(() => {
    return containerEl || editor?.view?.dom?.closest('.rich-text-editor-content') || document.body;
  }, [containerEl, editor]);

  const openHoverForAnchor = useCallback((anchorEl) => {
    if (!editor || !anchorEl) return;
    const href = anchorEl.getAttribute('href');
    if (!href) return;

    const container = getContainer();
    const coords = getPortalCoords(anchorEl.getBoundingClientRect(), false, container.getBoundingClientRect());
    const { text } = resolveLinkText(editor, anchorEl);

    currentAnchorRef.current = anchorEl;
    setHoverLink({ text, url: href });
    setHoverCoords(coords);
    setHoverOpen(true);
  }, [editor, getContainer]);

  const closeHover = useCallback(() => {
    if (!isPointerOverHoverPopover.current) {
      setHoverOpen(false);
      currentAnchorRef.current = null;
    }
  }, []);

  const openEditForAnchor = useCallback((anchorEl) => {
    if (!editor || !anchorEl) return;
    const href = anchorEl.getAttribute('href');
    if (!href) return;

    const container = getContainer();
    const coords = getPortalCoords(anchorEl.getBoundingClientRect(), true, container.getBoundingClientRect());
    const { text, range } = resolveLinkText(editor, anchorEl);
    if (range) {
      editor.commands.setTextSelection(range);
    }

    currentAnchorRef.current = anchorEl;
    setEditLink({ text, url: href });
    setEditCoords(coords);
    setEditOpen(true);
    setHoverOpen(false);
  }, [editor, getContainer]);

  useEffect(() => {
    if (!editor) return;

    // Expose imperative API for toolbar link button to open the edit modal
    editor.brunoOpenLinkEdit = ({ text, url } = {}) => {
      const container = getContainer();
      let coords = { top: 60, left: 60, visible: true };
      try {
        const { from } = editor.state.selection;
        const posCoords = editor.view.coordsAtPos(from);
        coords = getPortalCoords(posCoords, true, container.getBoundingClientRect());
      } catch (e) { /* ignore */ }

      currentAnchorRef.current = null; // New link, no anchor element
      setEditLink({ text: text || '', url: url || '' });
      setEditCoords(coords);
      setEditOpen(true);
      setHoverOpen(false);
    };

    return () => {
      if (editor) delete editor.brunoOpenLinkEdit;
    };
  }, [editor, getContainer]);

  useEffect(() => {
    if (!editor) return;
    const container = getContainer();

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      if (hoverOpen && currentAnchorRef.current) {
        setHoverCoords(getPortalCoords(currentAnchorRef.current.getBoundingClientRect(), false, containerRect));
      }
      if (editOpen) {
        if (currentAnchorRef.current) {
          setEditCoords(getPortalCoords(currentAnchorRef.current.getBoundingClientRect(), true, containerRect));
        } else {
          try {
            const { from } = editor.state.selection;
            const posCoords = editor.view.coordsAtPos(from);
            setEditCoords(getPortalCoords(posCoords, true, containerRect));
          } catch (e) { /* ignore */ }
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    // Also bind to window scroll in case the whole page scrolls
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [editor, getContainer, hoverOpen, editOpen]);

  useEffect(() => {
    if (!editor) return;

    const dom = editor.view.dom;

    const handleMouseOver = (e) => {
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;
      clearTimeout(hoverTimerRef.current);
      if (editOpen) return; // don't show hover when edit is open
      openHoverForAnchor(anchor);
    };

    const handleMouseOut = (e) => {
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;
      // Don't close if moving into the hover popover itself
      if (e.relatedTarget?.closest?.('[data-hover-popover]')) return;
      hoverTimerRef.current = setTimeout(closeHover, 200);
    };

    const handleClick = (e) => {
      if (!isEditable) return;
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;
      e.preventDefault();
      openEditForAnchor(anchor);
    };

    dom.addEventListener('mouseover', handleMouseOver);
    dom.addEventListener('mouseout', handleMouseOut);
    dom.addEventListener('click', handleClick);

    return () => {
      dom.removeEventListener('mouseover', handleMouseOver);
      dom.removeEventListener('mouseout', handleMouseOut);
      dom.removeEventListener('click', handleClick);
      clearTimeout(hoverTimerRef.current);
    };
  }, [editor, isEditable, editOpen, openHoverForAnchor, closeHover, openEditForAnchor]);

  if (!editor) return null;

  return (
    <Portal>
      {/* ── Hover view popover (both modes) ── */}
      {hoverOpen && (
        <StyledWrapper
          data-hover-popover="true"
          style={{
            top: `${hoverCoords.top}px`,
            left: `${hoverCoords.left}px`,
            display: hoverCoords.visible === false ? 'none' : undefined
          }}
          onMouseEnter={() => {
            isPointerOverHoverPopover.current = true;
            clearTimeout(hoverTimerRef.current);
          }}
          onMouseLeave={() => {
            isPointerOverHoverPopover.current = false;
            hoverTimerRef.current = setTimeout(closeHover, 200);
          }}
        >
          <div className="hover-link-view">
            <a
              href={hoverLink.url}
              target="_blank"
              rel="noreferrer"
              className="link-url"
              title={hoverLink.url}
              onClick={(e) => {
                // Always block the native anchor navigation — a link already
                // in the document (e.g. from a shared collection) hasn't been
                // through our own submit-time validation, so it must go
                // through the same isSafeUrl check as everything else.
                e.preventDefault();
                if (isSafeUrl(hoverLink.url)) {
                  window.open(hoverLink.url, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              {hoverLink.url}
            </a>
            <div className="view-separator" />
            <div className="action-icons">
              {isEditable && (
                <ToolHint text="Edit link" toolhintId="edit-link">
                  <button
                    type="button"
                    className="action-icon-btn"
                    onClick={() => {
                      setHoverOpen(false);
                      if (currentAnchorRef.current) {
                        openEditForAnchor(currentAnchorRef.current);
                      }
                    }}
                  >
                    <IconEdit size={14} strokeWidth={1.5} />
                  </button>
                </ToolHint>
              )}
              {isEditable && (
                <ToolHint text="Remove link" toolhintId="remove-link">
                  <button
                    type="button"
                    className="action-icon-btn"
                    onClick={() => {
                      setHoverOpen(false);
                      if (currentAnchorRef.current) {
                        const { range } = resolveLinkText(editor, currentAnchorRef.current);
                        if (range) {
                          const previousSelection = editor.state.selection;
                          editor.commands.setTextSelection(range);
                          if (onUnlink) onUnlink();
                          editor.commands.setTextSelection(previousSelection);
                          return;
                        }
                      }
                      if (onUnlink) onUnlink();
                    }}
                  >
                    <IconUnlink size={14} strokeWidth={1.5} />
                  </button>
                </ToolHint>
              )}
              <ToolHint text="Copy link" toolhintId="copy-link">
                <button
                  type="button"
                  className="action-icon-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(hoverLink.url).then(() => {
                      toast.success('Link copied to clipboard');
                    });
                    setHoverOpen(false);
                  }}
                >
                  <IconCopy size={14} strokeWidth={1.5} />
                </button>
              </ToolHint>
            </div>
          </div>
        </StyledWrapper>
      )}

      {/* ── Edit popover (edit mode only) ── */}
      <EditorLinkEditPopover
        isOpen={editOpen}
        externalCoords={editCoords}
        onClose={() => setEditOpen(false)}
        onSubmit={(data) => {
          if (onSubmit) onSubmit(data);
          setEditOpen(false);
        }}
        onUnlink={() => {
          if (onUnlink) onUnlink();
          setEditOpen(false);
        }}
        initialText={editLink.text}
        initialUrl={editLink.url}
      />
    </Portal>
  );
};

export default EditorLinkPopover;
