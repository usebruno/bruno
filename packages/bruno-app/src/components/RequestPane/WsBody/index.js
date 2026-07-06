import { get } from 'lodash';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { IconPlus } from '@tabler/icons';
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { SingleWSMessage } from './SingleWSMessage/index';

const getSelectedIndex = (messages) => {
  const idx = messages.findIndex((msg) => msg.selected);
  return idx >= 0 ? idx : 0;
};

const scrollPositions = new Map();

const WSBody = ({ item, collection, handleRun, onAddMessage }) => {
  const dispatch = useDispatch();
  const messagesContainerRef = useRef(null);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const messages = body?.ws || [];

  const selectedIndex = getSelectedIndex(messages);

  // Expand the selected message by default (falls back to first)
  const [expandedUids, setExpandedUids] = useState(() => {
    const uid = messages[selectedIndex]?.uid || messages[0]?.uid;
    return new Set(uid ? [uid] : []);
  });
  const [newMessageUid, setNewMessageUid] = useState(null);
  const prevMessagesLengthRef = useRef(messages.length);
  // uid of a message that was just expanded and should be scrolled to the top of the list
  const scrollToTopUidRef = useRef(null);

  const scrollRestoreRafRef = useRef(null);

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

  const toggleMessage = useCallback((uid) => {
    if (!uid) return;
    setExpandedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        // Expanding: bring this message to the top of the list once it re-renders.
        scrollToTopUidRef.current = uid;
        next.add(uid);
      }
      return next;
    });
  }, []);

  // After an expand re-renders the list, scroll the expanded message to the top.
  useLayoutEffect(() => {
    const uid = scrollToTopUidRef.current;
    if (!uid) return;
    scrollToTopUidRef.current = null;
    const container = messagesContainerRef.current;
    const el = document.getElementById(`ws-message-${uid}`);
    if (container && el) {
      // Clicking a message to expand it also fires the container's mousedown handler,
      // which queues a "restore scroll to where it was" for the next frame. Cancel that
      // pending restore, otherwise it would run and undo the scroll-to-top below.
      if (scrollRestoreRafRef.current) {
        cancelAnimationFrame(scrollRestoreRafRef.current);
        scrollRestoreRafRef.current = null;
      }
      container.scrollTop += el.getBoundingClientRect().top - container.getBoundingClientRect().top;
      scrollPositions.set(item.uid, container.scrollTop);
    }
  }, [expandedUids, item.uid]);

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
        setExpandedUids((prev) => new Set(prev).add(newMsg.uid));
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

  const handleNewMessageRendered = useCallback(() => {
    setNewMessageUid(null);
  }, []);

  // Restore the last scroll position on mount (component remounts on tab switch)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && scrollPositions.has(item.uid)) {
      container.scrollTop = scrollPositions.get(item.uid);
    }
  }, [item.uid]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      scrollPositions.set(item.uid, container.scrollTop);
    }
  }, [item.uid]);

  // Clicking into a message editor focuses CodeMirror, which makes the browser
  // scroll the container to bring the focused input into view. Snapshot the
  // scroll position before the click and restore it on the next frame so the
  // list doesn't jump when a message gains focus.
  const handleContainerMouseDownCapture = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const top = container.scrollTop;
    scrollRestoreRafRef.current = requestAnimationFrame(() => {
      scrollRestoreRafRef.current = null;
      if (container.scrollTop !== top) {
        container.scrollTop = top;
      }
    });
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
        onMouseDownCapture={handleContainerMouseDownCapture}
      >
        {messages.map((message, index) => (
          <SingleWSMessage
            key={message.uid}
            id={`ws-message-${message.uid}`}
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
          />
        ))}
      </div>
    </StyledWrapper>
  );
};

export default WSBody;
