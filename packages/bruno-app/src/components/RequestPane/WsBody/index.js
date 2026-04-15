import { get } from 'lodash';
import find from 'lodash/find';
import { updateWsSelectedMessageIndex } from 'providers/ReduxStore/slices/tabs';
import { IconPlus } from '@tabler/icons';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { uuid } from 'utils/common';
import StyledWrapper from './StyledWrapper';
import { SingleWSMessage } from './SingleWSMessage/index';

const ensureMessageUids = (messages, uidMapRef) => {
  const newMap = new Map();
  messages.forEach((_, index) => {
    const existingUid = uidMapRef.current.get(index);
    newMap.set(index, existingUid || uuid());
  });
  return newMap;
};

const WSBody = ({ item, collection, handleRun, onAddMessage }) => {
  const dispatch = useDispatch();
  const messagesContainerRef = useRef(null);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const messages = body?.ws || [];

  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const rawSelectedIndex = focusedTab?.wsSelectedMessageIndex ?? 0;
  // Clamp selected index to valid range
  const selectedIndex = messages.length > 0
    ? Math.min(rawSelectedIndex, messages.length - 1)
    : 0;

  const uidMapRef = useRef(new Map());
  uidMapRef.current = ensureMessageUids(messages, uidMapRef);

  const getMessageUid = (index) => uidMapRef.current.get(index);

  // First message is expanded by default (using uid)
  const [expandedUids, setExpandedUids] = useState(() => {
    const firstUid = getMessageUid(0);
    return new Set(firstUid ? [firstUid] : []);
  });
  const [newMessageUid, setNewMessageUid] = useState(null);
  const prevMessagesLengthRef = useRef(messages.length);

  const setSelectedIndex = useCallback((index) => {
    dispatch(updateWsSelectedMessageIndex({
      uid: item.uid,
      wsSelectedMessageIndex: index
    }));
  }, [dispatch, item.uid]);

  const toggleMessage = useCallback((index) => {
    const uid = getMessageUid(index);
    if (!uid) return;
    setExpandedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback((index) => {
    setSelectedIndex(index);
  }, [setSelectedIndex]);

  // React to new message being added (messages.length increased)
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const newIndex = messages.length - 1;
      const msgUid = getMessageUid(newIndex);
      if (msgUid) {
        setExpandedUids((prev) => new Set(prev).add(msgUid));
        setNewMessageUid(msgUid);
        setSelectedIndex(newIndex);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  const handleNewMessageRendered = useCallback(() => {
    setNewMessageUid(null);
  }, []);

  // Auto-scroll to bottom when new message is added
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);

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
      <div ref={messagesContainerRef} className="messages-container">
        {messages.map((message, index) => {
          const msgUid = getMessageUid(index);
          return (
            <SingleWSMessage
              key={msgUid}
              message={message}
              item={item}
              collection={collection}
              index={index}
              handleRun={handleRun}
              isExpanded={expandedUids.has(msgUid)}
              onToggle={() => toggleMessage(index)}
              isNew={newMessageUid === msgUid}
              onNewRendered={handleNewMessageRendered}
              isSelected={selectedIndex === index}
              onSelect={() => handleSelect(index)}
            />
          );
        })}
      </div>
    </StyledWrapper>
  );
};

export default WSBody;
