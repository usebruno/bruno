import { get } from 'lodash';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { IconPlus } from '@tabler/icons';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { usePersistedState } from 'hooks/usePersistedState';
import StyledWrapper from './StyledWrapper';
import { SingleWSMessage } from './SingleWSMessage/index';

const getSelectedIndex = (messages) => {
  const idx = messages.findIndex((msg) => msg.selected);
  return idx >= 0 ? idx : 0;
};

const WSBody = ({ item, collection, handleRun, onAddMessage }) => {
  const dispatch = useDispatch();
  const messagesContainerRef = useRef(null);
  const pinScrollRef = useRef(null);
  const [listScrollTop, setListScrollTop] = usePersistedState({
    key: `ws-list-scroll-${item.uid}`,
    default: 0
  });
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const messages = body?.ws || [];

  const selectedIndex = getSelectedIndex(messages);

  // Persist which messages are expanded per request so switching tabs and coming
  // back keeps every open message open (not just the selected one). Stored as an
  // array of uids since localStorage can't serialize a Set; defaults to the
  // selected message (falls back to first).
  // usePersistedState only reads `default` when there's no persisted value (first
  // mount, or when the key changes), so recomputing this is cheap and keeps it in
  // sync with the current messages for those reads.
  const defaultExpanded = useMemo(() => {
    const uid = messages[selectedIndex]?.uid || messages[0]?.uid;
    return uid ? [uid] : [];
  }, [messages, selectedIndex]);
  const [expandedUidList, setExpandedUidList] = usePersistedState({
    key: `ws-expanded-${item.uid}`,
    default: defaultExpanded
  });
  const expandedUids = useMemo(() => new Set(expandedUidList), [expandedUidList]);
  const [newMessageUid, setNewMessageUid] = useState(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // Track the message pane's height so an expanded editor can be capped to fit
  // inside it. A taller editor would overflow the pane and produce a second
  // scrollbar (the list) on top of the editor's own scroll.
  const [paneHeight, setPaneHeight] = useState(0);
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setPaneHeight(el.clientHeight));
    ro.observe(el);
    setPaneHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const setSelectedIndex = useCallback((index) => {
    const currentMessages = [...(body?.ws || [])];
    const updated = currentMessages.map((msg, i) => ({
      ...msg,
      selected: i === index
    }));
    dispatch(updateRequestBody({
      content: updated,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  }, [body, dispatch, item.uid, collection.uid]);

  // Refs/cancel for the mount scroll-restore loop (defined further below). Declared
  // here so scrollMessageToTop can cancel an in-flight restore before it starts
  // driving the scroll itself.
  const isRestoringRef = useRef(false);
  const restoreRafRef = useRef(null);
  const cancelRestore = useCallback(() => {
    if (restoreRafRef.current !== null) {
      cancelAnimationFrame(restoreRafRef.current);
      restoreRafRef.current = null;
    }
    isRestoringRef.current = false;
  }, []);

  // Scroll the list so the given message's header sits at the top. Runs for a few
  // frames because the list is still growing as the message expands.
  const scrollMessageToTop = useCallback((uid) => {
    // Find where this message sits in the list; its DOM wrapper is the child at
    // the same position.
    const index = messages.findIndex((m) => m.uid === uid);
    if (index < 0) return;
    // A deliberate expand takes over the scroll: cancel any in-flight restore so
    // the two RAF loops don't fight over scrollTop.
    cancelRestore();
    // Stop any animation already running so they don't fight over the scroll.
    if (pinScrollRef.current !== null) cancelAnimationFrame(pinScrollRef.current);
    let frames = 0;
    const align = () => {
      const el = messagesContainerRef.current;
      // Bail if the list is gone (unmounted) or this run was cancelled.
      if (!el || pinScrollRef.current === null) return;
      const wrapper = el.children[index];
      if (wrapper) {
        // Nudge the list by the gap between the wrapper's top and the list's top,
        // bringing the header flush with the top.
        el.scrollTop += wrapper.getBoundingClientRect().top - el.getBoundingClientRect().top;
      }
      // Keep re-aligning for up to 12 frames while the editor finishes opening,
      // then stop.
      if (++frames < 12) {
        pinScrollRef.current = requestAnimationFrame(align);
      } else {
        pinScrollRef.current = null;
      }
    };
    pinScrollRef.current = requestAnimationFrame(align);
  }, [messages, cancelRestore]);

  const toggleMessage = useCallback((uid) => {
    if (!uid) return;
    const willOpen = !expandedUids.has(uid);
    setExpandedUidList((prev) => (
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
    ));
    // Opening a message brings its header to the top of the list; collapsing
    // leaves the list where it is.
    if (willOpen) scrollMessageToTop(uid);
  }, [expandedUids, setExpandedUidList, scrollMessageToTop]);

  const handleSelect = useCallback((index) => {
    if (index !== selectedIndex) {
      setSelectedIndex(index);
    }
  }, [selectedIndex, setSelectedIndex]);

  // React to new message being added (messages.length increased)
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const newMsg = messages[messages.length - 1];
      if (newMsg?.uid) {
        setExpandedUidList((prev) => (prev.includes(newMsg.uid) ? prev : [...prev, newMsg.uid]));
        setNewMessageUid(newMsg.uid);
        setSelectedIndex(messages.length - 1);
      }

      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        container.scrollTop = container.scrollHeight;
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Drop uids of deleted messages so the persisted list doesn't accumulate stale
  // entries over the request's lifetime.
  useEffect(() => {
    const hasStale = expandedUidList.some((uid) => !messages.some((m) => m.uid === uid));
    if (hasStale) {
      setExpandedUidList((prev) => prev.filter((uid) => messages.some((m) => m.uid === uid)));
    }
  }, [messages, expandedUidList, setExpandedUidList]);

  const handleNewMessageRendered = useCallback(() => {
    setNewMessageUid(null);
  }, []);

  // Restore the last scroll position on mount (component remounts on tab switch).
  // The editors render their height after mount, so a one-shot set gets clamped
  // by a not-yet-full scrollHeight and lands short of where we left off (e.g. the
  // bottom). Re-apply the target each frame until it sticks (content is tall
  // enough), then stop. While restoring we suppress handleScroll so the clamped
  // value can't overwrite the saved one; a real user scroll (or a deliberate
  // expand) cancels the restore.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const target = listScrollTop;
    if (!target) return; // nothing to restore (top) — don't fight a fresh scroll
    isRestoringRef.current = true;
    let frames = 0;
    const apply = () => {
      const el = messagesContainerRef.current;
      if (!el || !isRestoringRef.current) return; // cancelled by a user scroll
      el.scrollTop = target;
      const stuck = el.scrollTop === target; // false while still clamped by a short scrollHeight
      if (!stuck && ++frames < 20) {
        restoreRafRef.current = requestAnimationFrame(apply);
      } else {
        cancelRestore();
      }
    };
    restoreRafRef.current = requestAnimationFrame(apply);
    return cancelRestore;
  }, [item.uid, cancelRestore]);

  const handleScroll = useCallback(() => {
    if (isRestoringRef.current) return; // don't persist the clamped value mid-restore
    const container = messagesContainerRef.current;
    if (container) {
      setListScrollTop(container.scrollTop);
    }
  }, [setListScrollTop]);

  // Typing can make the browser scroll the list to follow the cursor, flinging
  // the panel. Hold the list's scroll for a few frames so keystrokes can't move
  // it; a real scroll (wheel/touch) releases it. Clicks are handled separately
  // by the editor's `containScroll`.
  const pinListScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const top = container.scrollTop;
    let frames = 0;
    const pin = () => {
      const el = messagesContainerRef.current;
      if (!el || pinScrollRef.current === null) return;
      if (el.scrollTop !== top) el.scrollTop = top;
      if (++frames < 8) {
        pinScrollRef.current = requestAnimationFrame(pin);
      } else {
        pinScrollRef.current = null;
      }
    };
    // Cancel any in-flight pin so a fresh gesture re-snapshots the current top.
    if (pinScrollRef.current !== null) cancelAnimationFrame(pinScrollRef.current);
    pinScrollRef.current = requestAnimationFrame(pin);
  }, []);

  // A real user scroll (wheel/touch) releases the pin and cancels any in-flight
  // scroll restore immediately the user is taking over.
  const releasePin = useCallback(() => {
    if (pinScrollRef.current !== null) {
      cancelAnimationFrame(pinScrollRef.current);
      pinScrollRef.current = null;
    }
    cancelRestore();
  }, [cancelRestore]);

  useEffect(() => () => cancelAnimationFrame(pinScrollRef.current), []);

  if (!messages.length) {
    return (
      <StyledWrapper>
        <div className="empty-state">
          <p>No WebSocket messages available</p>
          <button className="add-message-link" data-testid="ws-add-message" onClick={onAddMessage}>
            <IconPlus size={14} strokeWidth={1.5} />
            <span>Add message</span>
          </button>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <div
        ref={messagesContainerRef}
        className="messages-container"
        data-testid="ws-messages-container"
        onScroll={handleScroll}
        onKeyDownCapture={pinListScroll}
        onWheel={releasePin}
        onTouchMove={releasePin}
      >
        {messages.map((message, index) => (
          <SingleWSMessage
            key={message.uid}
            message={message}
            item={item}
            collection={collection}
            index={index}
            handleRun={handleRun}
            isExpanded={expandedUids.has(message.uid)}
            onToggle={() => toggleMessage(message.uid)}
            isNew={newMessageUid === message.uid}
            onNewRendered={handleNewMessageRendered}
            isSelected={selectedIndex === index}
            onSelect={() => handleSelect(index)}
            paneHeight={paneHeight}
          />
        ))}
      </div>
    </StyledWrapper>
  );
};

export default WSBody;
