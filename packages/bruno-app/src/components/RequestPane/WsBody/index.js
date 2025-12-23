import { get } from 'lodash';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { IconPlus } from '@tabler/icons';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ToolHint from 'components/ToolHint/index';
import StyledWrapper from './StyledWrapper';
import { SingleWSMessage } from './SingleWSMessage/index';

const WSBody = ({ item, collection, handleRun }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const isVerticalLayout = preferences?.layout?.responsePaneOrientation === 'vertical';
  const dispatch = useDispatch();
  const [collapsedMessages, setCollapsedMessages] = useState([]);
  const messagesContainerRef = useRef(null);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');

  const methodType = item.draft ? get(item, 'draft.request.methodType') : get(item, 'request.methodType');
  const canClientSendMultipleMessages = false;

  // Auto-scroll to the latest message when messages are added
  useEffect(() => {
    if (messagesContainerRef.current && body?.ws?.length > 0) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [body?.ws?.length]);

  const toggleMessageCollapse = (index) => {
    setCollapsedMessages((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const addNewMessage = () => {
    const currentMessages = Array.isArray(body.ws) ? [...body.ws] : [];

    currentMessages.push({
      name: `message ${currentMessages.length + 1}`,
      content: '{}'
    });

    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  if (!body?.ws || !Array.isArray(body.ws)) {
    return (
      <StyledWrapper isVerticalLayout={isVerticalLayout}>
        <div className="flex flex-col items-center justify-center py-8">
          <p className="ws-empty-message mb-4">No WebSocket messages available</p>
          <ToolHint text="Add the first message to your WebSocket request" toolhintId="add-first-msg">
            <button
              onClick={addNewMessage}
              className="ws-add-button flex items-center justify-center gap-2 py-2 px-4 rounded-md border transition-colors"
            >
              <IconPlus size={16} strokeWidth={1.5} className="ws-add-icon" />
              <span className="ws-add-icon font-medium">Add First Message</span>
            </button>
          </ToolHint>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper isVerticalLayout={isVerticalLayout}>
      <div
        ref={messagesContainerRef}
        id="ws-messages-container"
        className={`flex-1 ${body.ws.length === 1 || !canClientSendMultipleMessages ? 'h-full' : 'overflow-y-auto'} ${canClientSendMultipleMessages && 'pb-16'
        }`}
      >
        {body.ws
          .filter((_, index) => canClientSendMultipleMessages || index === 0)
          .map((message, index) => (
            <SingleWSMessage
              key={index}
              message={message}
              item={item}
              collection={collection}
              index={index}
              methodType={methodType}
              isCollapsed={collapsedMessages.includes(index)}
              onToggleCollapse={() => toggleMessageCollapse(index)}
              handleRun={handleRun}
              canClientSendMultipleMessages={canClientSendMultipleMessages}
            />
          ))}
      </div>

      {canClientSendMultipleMessages && (
        <div className="add-message-btn-container">
          <ToolHint text="Add a new WebSocket message to the request" toolhintId="add-msg-fixed">
            <button
              onClick={addNewMessage}
              className="ws-add-button add-message-btn flex items-center justify-center gap-2 py-2 px-4 rounded-md border transition-colors shadow-md"
            >
              <IconPlus size={16} strokeWidth={1.5} className="ws-add-icon" />
              <span className="ws-add-icon font-medium">Add Message</span>
            </button>
          </ToolHint>
        </div>
      )}
    </StyledWrapper>
  );
};

export default WSBody;
