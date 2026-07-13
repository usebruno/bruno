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
  const [expandedUidList, setExpandedUidList] = usePersistedState({
    key: `ws-expanded-${item.uid}`,
    default: (() => {
      const uid = messages[selectedIndex]?.uid || messages[0]?.uid;
      return uid ? [uid] : [];
    })()
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

  const scrollMessageToTop = useCallback((uid) => {
    const index = messages.findIndex((m) => m.uid === uid);
    if (index < 0) return;
    if (pinScrollRef.current !== null) cancelAnimationFrame(pinScrollRef.current);
    let frames = 0;
    const align = () => {
      const el = messagesContainerRef.current;
      if (!el || pinScrollRef.current === null) return;
      const wrapper = el.children[index];
      if (wrapper) {
        el.scrollTop += wrapper.getBoundingClientRect().top - el.getBoundingClientRect().top;
      }
      if (++frames < 12) {
        pinScrollRef.current = requestAnimationFrame(align);
      } else {
        pinScrollRef.current = null;
      }
    };
    pinScrollRef.current = requestAnimationFrame(align);
  }, [messages]);

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

  // Restore the last scroll position on mount (component remounts on tab switch,
  // so listScrollTop is read synchronously for this request).
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = listScrollTop;
    }
  }, [item.uid]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      setListScrollTop(container.scrollTop);
    }
  }, [setListScrollTop]);

  // Clicking or typing in an editor makes the browser scroll the list to reveal
  // CodeMirror's cursor, flinging the whole panel. Pin the list's scrollTop for a
  // few frames so focus/keystrokes can't move it (the editor still scrolls
  // internally); a real user scroll (wheel/touch) releases the pin.
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

  // A real user scroll (wheel/touch) releases the pin immediately.
  const releasePin = useCallback(() => {
    if (pinScrollRef.current !== null) {
      cancelAnimationFrame(pinScrollRef.current);
      pinScrollRef.current = null;
    }
  }, []);

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
        onMouseDownCapture={pinListScroll}
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
