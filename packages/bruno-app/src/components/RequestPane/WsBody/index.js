import { get } from 'lodash';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { IconPlus } from '@tabler/icons';
import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { SingleWSMessage } from './SingleWSMessage/index';

const WSBody = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const messagesContainerRef = useRef(null);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const messages = body?.ws || [];

  // First message is expanded by default
  const [expandedMessages, setExpandedMessages] = useState(new Set([0]));
  const [newMessageIndex, setNewMessageIndex] = useState(null);

  const toggleMessage = (index) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const addNewMessage = () => {
    const currentMessages = Array.isArray(body.ws) ? [...body.ws] : [];
    const newIndex = currentMessages.length;
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
    // Expand the newly added message and mark it as new for auto-focus
    setExpandedMessages((prev) => new Set(prev).add(newIndex));
    setNewMessageIndex(newIndex);
  };

  // Clear newMessageIndex after it's been consumed
  const handleNewMessageRendered = () => {
    setNewMessageIndex(null);
  };

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
        {messages.map((message, index) => (
          <SingleWSMessage
            key={index}
            message={message}
            item={item}
            collection={collection}
            index={index}
            handleRun={handleRun}
            isExpanded={expandedMessages.has(index)}
            onToggle={() => toggleMessage(index)}
            isNew={newMessageIndex === index}
            onNewRendered={handleNewMessageRendered}
          />
        ))}
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
