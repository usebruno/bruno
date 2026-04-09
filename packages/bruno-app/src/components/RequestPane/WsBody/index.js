import { get } from 'lodash';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { IconPlus } from '@tabler/icons';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
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

const WSBody = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const messagesContainerRef = useRef(null);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const messages = body?.ws || [];

  const uidMapRef = useRef(new Map());
  uidMapRef.current = ensureMessageUids(messages, uidMapRef);

  const getMessageUid = (index) => uidMapRef.current.get(index);

  // First message is expanded by default (using uid)
  const [expandedUids, setExpandedUids] = useState(() => {
    const firstUid = getMessageUid(0);
    return new Set(firstUid ? [firstUid] : []);
  });
  const [newMessageUid, setNewMessageUid] = useState(null);

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

  const addNewMessage = () => {
    const currentMessages = Array.isArray(body.ws) ? [...body.ws] : [];
    const newIndex = currentMessages.length;
    const msgUid = uuid();
    currentMessages.push({
      name: `message ${newIndex + 1}`,
      content: '{}',
      type: 'json'
    });
    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
    // Pre-assign uid for the new message so we can expand and focus it
    uidMapRef.current.set(newIndex, msgUid);
    setExpandedUids((prev) => new Set(prev).add(msgUid));
    setNewMessageUid(msgUid);
  };

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
          <button className="add-message-link" data-testid="ws-add-message" onClick={addNewMessage}>
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
            />
          );
        })}
      </div>
      <div className="add-message-footer">
        <button className="add-message-link" data-testid="ws-add-message" onClick={addNewMessage}>
          <IconPlus size={14} strokeWidth={1.5} />
          <span>Add message</span>
        </button>
      </div>
    </StyledWrapper>
  );
};

export default WSBody;
