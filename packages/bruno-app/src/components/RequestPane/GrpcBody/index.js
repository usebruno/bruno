import React, { useEffect, useRef } from 'react';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { sendGrpcMessage, generateGrpcSampleMessage } from 'utils/network/index';
import useLocalStorage from 'hooks/useLocalStorage';

import CodeEditor from 'components/CodeEditor/index';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';
import { IconSend, IconRefresh, IconWand, IconPlus, IconTrash } from '@tabler/icons';
import ToolHint from 'components/ToolHint/index';
import { toastError } from 'utils/common/error';
import toast from 'react-hot-toast';
import { getAbsoluteFilePath } from 'utils/common/path';
import { prettifyJsonString } from 'utils/common/index';

const MessageToolbar = ({
  index,
  canClientStream,
  isConnectionActive,
  onSend,
  onRegenerateMessage,
  onPrettify,
  onDeleteMessage,
  showDelete
}) => {
  return (
    <div className="message-toolbar">
      <span className="message-label">Message {index + 1}</span>
      <div className="toolbar-actions">
        <ToolHint text="Format JSON" toolhintId={`prettify-msg-${index}`}>
          <button onClick={onPrettify} className="toolbar-btn">
            <IconWand size={16} strokeWidth={1.5} />
          </button>
        </ToolHint>

        <ToolHint text="Generate sample" toolhintId={`regenerate-msg-${index}`}>
          <button onClick={onRegenerateMessage} className="toolbar-btn">
            <IconRefresh size={16} strokeWidth={1.5} />
          </button>
        </ToolHint>

        {canClientStream && (
          <ToolHint text={isConnectionActive ? 'Send message' : 'Connection not active'} toolhintId={`send-msg-${index}`}>
            <button
              onClick={onSend}
              disabled={!isConnectionActive}
              className={`toolbar-btn ${!isConnectionActive ? 'disabled' : ''}`}
            >
              <IconSend size={16} strokeWidth={1.5} />
            </button>
          </ToolHint>
        )}

        {showDelete && (
          <ToolHint text="Delete message" toolhintId={`delete-msg-${index}`}>
            <button onClick={onDeleteMessage} className="toolbar-btn delete">
              <IconTrash size={16} strokeWidth={1.5} />
            </button>
          </ToolHint>
        )}
      </div>
    </div>
  );
};

const SingleGrpcMessage = ({ message, item, collection, index, methodType, handleRun, canClientSendMultipleMessages, isLast }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const isConnectionActive = useSelector((state) => state.collections.activeConnections.includes(item.uid));

  const [reflectionCache] = useLocalStorage('bruno.grpc.reflectionCache', {});
  const [protofileCache] = useLocalStorage('bruno.grpc.protofileCache', {});

  const canClientStream = methodType === 'client-streaming' || methodType === 'bidi-streaming';
  const { name, content } = message;

  const onEdit = (value) => {
    const currentMessages = [...(body.grpc || [])];
    currentMessages[index] = {
      name: name ? name : `message ${index + 1}`,
      content: value
    };
    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  const onSend = async () => {
    try {
      await sendGrpcMessage(item, collection.uid, content);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const onRegenerateMessage = async () => {
    try {
      const methodPath = item.draft?.request?.method || item.request?.method;
      if (!methodPath) {
        toastError(new Error('Method path not found in request'));
        return;
      }

      const url = item.draft?.request?.url || item.request?.url;
      const protoPath = item.draft?.request?.protoPath || item.request?.protoPath;

      let methodMetadata = null;
      if (protoPath) {
        const absolutePath = getAbsoluteFilePath(collection.pathname, protoPath);
        const cachedMethods = protofileCache[absolutePath];
        if (cachedMethods) {
          methodMetadata = cachedMethods.find((method) => method.path === methodPath);
        }
      } else if (url) {
        const cachedMethods = reflectionCache[url];
        if (cachedMethods) {
          methodMetadata = cachedMethods.find((method) => method.path === methodPath);
        }
      }

      const result = await generateGrpcSampleMessage(methodPath, content, {
        arraySize: 2,
        methodMetadata
      });

      if (result.success) {
        const currentMessages = [...(body.grpc || [])];
        currentMessages[index] = {
          name: name ? name : `message ${index + 1}`,
          content: result.message
        };
        dispatch(updateRequestBody({
          content: currentMessages,
          itemUid: item.uid,
          collectionUid: collection.uid
        }));
        toast.success('Sample message generated');
      } else {
        toastError(new Error(result.error || 'Failed to generate sample message'));
      }
    } catch (error) {
      console.error('Error generating sample message:', error);
      toastError(error);
    }
  };

  const onDeleteMessage = () => {
    const currentMessages = [...(body.grpc || [])];
    currentMessages.splice(index, 1);
    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  const onPrettify = () => {
    try {
      const prettyBodyJson = prettifyJsonString(content);
      const currentMessages = [...(body.grpc || [])];
      currentMessages[index] = {
        name: name ? name : `message ${index + 1}`,
        content: prettyBodyJson
      };
      dispatch(updateRequestBody({
        content: currentMessages,
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
    } catch (e) {
      toastError(new Error('Unable to prettify. Invalid JSON format.'));
    }
  };

  const isSingleMessage = !canClientSendMultipleMessages || body.grpc.length === 1;

  return (
    <div className={`message-container ${isSingleMessage ? 'single' : ''} ${isLast ? 'last' : ''}`}>
      <MessageToolbar
        index={index}
        canClientStream={canClientStream}
        isConnectionActive={isConnectionActive}
        onSend={onSend}
        onRegenerateMessage={onRegenerateMessage}
        onPrettify={onPrettify}
        onDeleteMessage={onDeleteMessage}
        showDelete={index > 0}
      />
      <div className="editor-container">
        <CodeEditor
          collection={collection}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          value={content}
          onEdit={onEdit}
          onRun={handleRun}
          onSave={onSave}
          mode="application/ld+json"
          enableVariableHighlighting={true}
        />
      </div>
    </div>
  );
};

const GrpcBody = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const messagesContainerRef = useRef(null);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const methodType = item.draft ? get(item, 'draft.request.methodType') : get(item, 'request.methodType');
  const canClientSendMultipleMessages = methodType === 'client-streaming' || methodType === 'bidi-streaming';

  useEffect(() => {
    if (messagesContainerRef.current && body?.grpc?.length > 0) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [body?.grpc?.length]);

  const addNewMessage = () => {
    const currentMessages = Array.isArray(body.grpc) ? [...body.grpc] : [];
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

  if (!body?.grpc || !Array.isArray(body.grpc)) {
    return (
      <StyledWrapper>
        <div className="empty-state">
          <p>No gRPC messages available</p>
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

  const messagesToShow = body.grpc.filter((_, index) => canClientSendMultipleMessages || index === 0);

  return (
    <StyledWrapper>
      <div
        ref={messagesContainerRef}
        className={`messages-container ${canClientSendMultipleMessages && messagesToShow.length > 1 ? 'multi' : 'single'}`}
      >
        {messagesToShow.map((message, index) => (
          <SingleGrpcMessage
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

export default GrpcBody;
