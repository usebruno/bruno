import { get } from 'lodash';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { IconPlus } from '@tabler/icons';
import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';
import { SingleWSMessage } from './SingleWSMessage/index';

const WSBody = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
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
      <StyledWrapper>
        <div className="empty-state">
          <p>No WebSocket messages available</p>
          <Button
            onClick={addNewMessage}
            variant="filled"
            color="secondary"
            size="sm"
            icon={<IconPlus size={14} strokeWidth={1.5} />}
          >
            Add Message
          </Button>
        </div>
      </StyledWrapper>
    );
  }

  const messagesToShow = body.ws.filter((_, index) => canClientSendMultipleMessages || index === 0);

  return (
    <StyledWrapper>
      <div
        ref={messagesContainerRef}
        className={`messages-container ${canClientSendMultipleMessages && messagesToShow.length > 1 ? 'multi' : 'single'}`}
      >
        {messagesToShow.map((message, index) => (
          <SingleWSMessage
            key={index}
            message={message}
            item={item}
            collection={collection}
            index={index}
            methodType={methodType}
            handleRun={handleRun}
            canClientSendMultipleMessages={canClientSendMultipleMessages}
            isLast={index === messagesToShow.length - 1}
          />
        ))}
      </div>

      {canClientSendMultipleMessages && (
        <div className="add-message-footer">
          <Button
            onClick={addNewMessage}
            variant="filled"
            color="secondary"
            size="sm"
            fullWidth
            icon={<IconPlus size={14} strokeWidth={1.5} />}
          >
            Add Message
          </Button>
        </div>
      )}
    </StyledWrapper>
  );
};

export default WSBody;
