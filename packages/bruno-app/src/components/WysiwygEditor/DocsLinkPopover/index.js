import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getMarkRange } from '@tiptap/core';
import { Tooltip } from 'react-tooltip';
import { IconEdit, IconUnlink, IconCopy, IconExternalLink } from '@tabler/icons';
import toast from 'react-hot-toast';
import DocsLinkEditPopover from '../DocsLinkEditPopover';
import StyledWrapper from './StyledWrapper';

const HOVER_TOOLTIP_ID = 'docs-link-hover-tooltip';

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
 * Gets coordinates relative to the editor's scrollable content container.
 * This keeps the popover anchored to the link during scroll.
 */
function getRelativeCoords(anchorEl, containerEl) {
  const anchorRect = anchorEl.getBoundingClientRect();
  const containerRect = containerEl.getBoundingClientRect();

  const left = Math.min(
    Math.max(8, anchorRect.left - containerRect.left), // 8px left padding
    containerRect.width - 280 - 8 // 8px right padding
  );
  // Add some spacing so the top of the popover has a gap
  const top = anchorRect.bottom - containerRect.top + containerEl.scrollTop + 6;

  return { top, left };
}

/**
 * DocsLinkPopover manages:
 * 1. A lightweight hover preview that appears in BOTH edit and preview modes.
 * 2. A full edit popover (edit-mode) triggered only in edit mode.
 *
 * Both are rendered INSIDE the editor's scrollable container (not a Portal),
 * so they naturally scroll with the content.
 */
const DocsLinkPopover = ({ editor, onSubmit, onUnlink, containerEl }) => {
  // --- Hover View Popover ---
  const [hoverOpen, setHoverOpen] = useState(false);
  const [hoverCoords, setHoverCoords] = useState({ top: 0, left: 0 });
  const [hoverLink, setHoverLink] = useState({ text: '', url: '' });

  // --- Edit Popover ---
  const [editOpen, setEditOpen] = useState(false);
  const [editCoords, setEditCoords] = useState({ top: 0, left: 0 });
  const [editLink, setEditLink] = useState({ text: '', url: '' });

  const hoverTimerRef = useRef(null);
  const isHoverHovered = useRef(false);
  const currentAnchorRef = useRef(null);

  const isEditable = editor?.isEditable ?? false;

  const getContainer = useCallback(() => {
    return containerEl || editor?.view?.dom?.closest('.wysiwyg-editor-content') || document.body;
  }, [containerEl, editor]);

  const openHoverForAnchor = useCallback((anchorEl) => {
    if (!editor || !anchorEl) return;
    const href = anchorEl.getAttribute('href');
    if (!href) return;

    const container = getContainer();
    const coords = getRelativeCoords(anchorEl, container);
    const { text } = resolveLinkText(editor, anchorEl);

    currentAnchorRef.current = anchorEl;
    setHoverLink({ text, url: href });
    setHoverCoords(coords);
    setHoverOpen(true);
  }, [editor, getContainer]);

  const closeHover = useCallback(() => {
    if (!isHoverHovered.current) {
      setHoverOpen(false);
      currentAnchorRef.current = null;
    }
  }, []);

  const openEditForAnchor = useCallback((anchorEl) => {
    if (!editor || !anchorEl) return;
    const href = anchorEl.getAttribute('href');
    if (!href) return;

    const container = getContainer();
    const coords = getRelativeCoords(anchorEl, container);
    const { text, range } = resolveLinkText(editor, anchorEl);
    if (range) {
      editor.commands.setTextSelection(range);
    }

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
      // Try to position relative to current cursor selection
      let coords = { top: 60, left: 60 };
      try {
        const { from } = editor.state.selection;
        const posCoords = editor.view.coordsAtPos(from);
        const containerRect = container.getBoundingClientRect();
        coords = {
          top: posCoords.bottom - containerRect.top + container.scrollTop + 6,
          left: Math.min(Math.max(8, posCoords.left - containerRect.left), containerRect.width - 280 - 8)
        };
      } catch (e) { /* ignore */ }

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
    <>
      {/* ── Hover view popover (both modes) ── */}
      {hoverOpen && (
        <StyledWrapper
          data-hover-popover="true"
          style={{ top: `${hoverCoords.top}px`, left: `${hoverCoords.left}px` }}
          onMouseEnter={() => {
            isHoverHovered.current = true;
            clearTimeout(hoverTimerRef.current);
          }}
          onMouseLeave={() => {
            isHoverHovered.current = false;
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
                if (isEditable) e.preventDefault();
              }}
            >
              {hoverLink.url}
            </a>
            <div className="view-separator" />
            <div className="action-icons">
              {isEditable && (
                <button
                  type="button"
                  className="action-icon-btn"
                  data-tooltip-id={HOVER_TOOLTIP_ID}
                  data-tooltip-content="Edit link"
                  onClick={() => {
                    setHoverOpen(false);
                    if (currentAnchorRef.current) {
                      openEditForAnchor(currentAnchorRef.current);
                    }
                  }}
                >
                  <IconEdit size={14} strokeWidth={1.5} />
                </button>
              )}
              {isEditable && (
                <button
                  type="button"
                  className="action-icon-btn"
                  data-tooltip-id={HOVER_TOOLTIP_ID}
                  data-tooltip-content="Remove link"
                  onClick={() => {
                    setHoverOpen(false);
                    if (onUnlink) onUnlink();
                  }}
                >
                  <IconUnlink size={14} strokeWidth={1.5} />
                </button>
              )}
              <button
                type="button"
                className="action-icon-btn"
                data-tooltip-id={HOVER_TOOLTIP_ID}
                data-tooltip-content="Copy link"
                onClick={() => {
                  navigator.clipboard.writeText(hoverLink.url);
                  toast.success('Link copied to clipboard');
                  setHoverOpen(false);
                }}
              >
                <IconCopy size={14} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                className="action-icon-btn"
                data-tooltip-id={HOVER_TOOLTIP_ID}
                data-tooltip-content="Open in new tab"
                onClick={() => window.open(hoverLink.url, '_blank', 'noreferrer')}
              >
                <IconExternalLink size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <Tooltip
            id={HOVER_TOOLTIP_ID}
            place="top"
            positionStrategy="fixed"
            style={{ zIndex: 99999, fontSize: '11px' }}
          />
        </StyledWrapper>
      )}

      {/* ── Edit popover (edit mode only) ── */}
      <DocsLinkEditPopover
        editor={editor}
        isOpen={editOpen}
        mode="edit"
        isEditable={true}
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
    </>
  );
};

export default DocsLinkPopover;
