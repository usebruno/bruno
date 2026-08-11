import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getMarkRange } from '@tiptap/core';
import { IconEdit, IconUnlink, IconCopy } from '@tabler/icons';
import toast from 'react-hot-toast';
import ToolHint from 'components/ToolHint';
import { isHttpUrl } from 'utils/url/index';
import EditorLinkEditPopover from '../EditorLinkEditPopover';
import StyledWrapper from './StyledWrapper';
import Portal from 'ui/Portal';
import { createPopper } from '@popperjs/core';

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

const EditorLinkPopover = ({ editor, onSubmit, onUnlink, containerEl }) => {
  // --- Hover View Popover ---
  const [hoverOpen, setHoverOpen] = useState(false);
  const [hoverLink, setHoverLink] = useState({ text: '', url: '' });

  // --- Edit Popover ---
  const [editOpen, setEditOpen] = useState(false);
  const [editLink, setEditLink] = useState({ text: '', url: '' });

  const hoverTimerRef = useRef(null);
  const isPointerOverHoverPopover = useRef(false);
  const [activeAnchor, setActiveAnchor] = useState(null);

  const hoverPopoverElRef = useRef(null);
  const editPopoverElRef = useRef(null);

  const hoverPopperInstanceRef = useRef(null);
  const editPopperInstanceRef = useRef(null);

  const isEditable = editor?.isEditable ?? false;

  const getContainer = useCallback(() => {
    return containerEl || editor?.view?.dom?.closest('.rich-text-editor-content') || document.body;
  }, [containerEl, editor]);

  const getPopperModifiers = useCallback((container) => [
    {
      name: 'preventOverflow',
      options: {
        boundary: container,
        padding: 8
      }
    },
    {
      name: 'flip',
      options: {
        boundary: container,
        fallbackPlacements: ['top', 'bottom']
      }
    },
    {
      name: 'offset',
      options: {
        offset: [0, 4]
      }
    }
  ], []);

  const createVirtualElement = (coords) => ({
    getBoundingClientRect: () => ({
      width: 0,
      height: 0,
      top: coords.top,
      right: coords.left,
      bottom: coords.top,
      left: coords.left
    })
  });

  // --- Popper initialization for Hover Popover ---
  useEffect(() => {
    if (hoverOpen && hoverPopoverElRef.current && activeAnchor) {
      hoverPopperInstanceRef.current = createPopper(activeAnchor, hoverPopoverElRef.current, {
        placement: 'bottom',
        strategy: 'fixed',
        modifiers: getPopperModifiers(getContainer())
      });
    }

    return () => {
      if (hoverPopperInstanceRef.current) {
        hoverPopperInstanceRef.current.destroy();
        hoverPopperInstanceRef.current = null;
      }
    };
  }, [hoverOpen, activeAnchor, getContainer, getPopperModifiers]);

  // --- Popper initialization for Edit Popover ---
  useEffect(() => {
    if (editOpen && editPopoverElRef.current && activeAnchor) {
      editPopperInstanceRef.current = createPopper(activeAnchor, editPopoverElRef.current, {
        placement: 'bottom',
        strategy: 'fixed',
        modifiers: getPopperModifiers(getContainer())
      });
    }

    return () => {
      if (editPopperInstanceRef.current) {
        editPopperInstanceRef.current.destroy();
        editPopperInstanceRef.current = null;
      }
    };
  }, [editOpen, activeAnchor, getContainer, getPopperModifiers]);

  const openHoverForAnchor = useCallback((anchorEl) => {
    if (!editor || !anchorEl) return;
    const href = anchorEl.getAttribute('href');
    if (!href) return;

    const { text } = resolveLinkText(editor, anchorEl);

    setActiveAnchor(anchorEl);
    setHoverLink({ text, url: href });
    setHoverOpen(true);
  }, [editor]);

  const closeHover = useCallback(() => {
    if (!isPointerOverHoverPopover.current) {
      setHoverOpen(false);
      // activeAnchor is intentionally left set — openEditForAnchor reads the
      // last-hovered anchor when the user clicks the popover's edit icon.
    }
  }, []);

  const openEditForAnchor = useCallback((anchorEl) => {
    if (!editor || !anchorEl) return;
    const href = anchorEl.getAttribute('href');
    if (!href) return;

    const { text, range } = resolveLinkText(editor, anchorEl);
    if (range) {
      editor.commands.setTextSelection(range);
    }

    setActiveAnchor(anchorEl);
    setEditLink({ text, url: href });
    setEditOpen(true);
    setHoverOpen(false);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    editor.brunoOpenLinkEdit = ({ text, url } = {}) => {
      try {
        const { from } = editor.state.selection;
        const posCoords = editor.view.coordsAtPos(from);
        setActiveAnchor(createVirtualElement(posCoords));
      } catch (e) {
        setActiveAnchor(createVirtualElement({ top: window.innerHeight / 2, left: window.innerWidth / 2 }));
      }

      setEditLink({ text: text || '', url: url || '' });
      setEditOpen(true);
      setHoverOpen(false);
    };

    return () => {
      if (editor) delete editor.brunoOpenLinkEdit;
    };
  }, [editor]);

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
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;

      if (isEditable) {
        e.preventDefault();
        openEditForAnchor(anchor);
        return;
      }

      // Always block the anchor's native navigation — anything short of a real
      // http(s) URL (a hash route, a root-relative path, or a bare word like
      // "abcd") resolves against the current document and would otherwise
      // redirect the app itself instead of opening in the system browser.
      const href = anchor.getAttribute('href');
      e.preventDefault();
      if (isHttpUrl(href)) {
        window.open(href, '_blank', 'noopener,noreferrer');
      }
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
          ref={hoverPopoverElRef}
          data-hover-popover="true"
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
                // through the same isHttpUrl check as everything else.
                e.preventDefault();

                if (isHttpUrl(hoverLink.url)) {
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
                    data-testid="link-hover-edit-btn"
                    onClick={() => {
                      setHoverOpen(false);
                      if (activeAnchor) {
                        openEditForAnchor(activeAnchor);
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
                    data-testid="link-hover-unlink-btn"
                    onClick={() => {
                      setHoverOpen(false);
                      if (activeAnchor && activeAnchor instanceof HTMLElement) {
                        const { range } = resolveLinkText(editor, activeAnchor);
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
        ref={editPopoverElRef}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={(data) => {
          if (onSubmit) onSubmit(data);
          setEditOpen(false);
        }}
        initialText={editLink.text}
        initialUrl={editLink.url}
      />
    </Portal>
  );
};

export default EditorLinkPopover;
