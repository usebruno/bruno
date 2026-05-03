import { get } from 'lodash';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { IconPlus } from '@tabler/icons';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { SingleWSMessage } from './SingleWSMessage/index';

const getSelectedIndex = (messages) => {
  const idx = messages.findIndex((msg) => msg.selected);
  return idx >= 0 ? idx : 0;
};

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
        next.add(uid);
      }
      return next;
    });
  }, []);

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
