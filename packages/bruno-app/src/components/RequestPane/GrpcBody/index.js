import React, { useEffect, useRef } from 'react';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'providers/Theme';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { sendGrpcMessage, generateGrpcSampleMessage } from 'utils/network/index';
import useLocalStorage from 'hooks/useLocalStorage';

import CodeEditor from 'components/CodeEditor/index';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
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
  const { t } = useTranslation();
  return (
    <div className="message-toolbar">
      <span className="message-label">{t('GRPC_BODY.MESSAGE')} {index + 1}</span>
      <div className="toolbar-actions mr-2">
        <ToolHint text={t('GRPC_BODY.FORMAT_JSON')} toolhintId={`prettify-msg-${index}`}>
          <button onClick={onPrettify} className="toolbar-btn">
            <IconWand size={16} strokeWidth={1.5} />
          </button>
        </ToolHint>

        <ToolHint text={t('GRPC_BODY.GENERATE_SAMPLE')} toolhintId={`regenerate-msg-${index}`}>
          <button onClick={onRegenerateMessage} className="toolbar-btn">
            <IconRefresh size={16} strokeWidth={1.5} />
          </button>
        </ToolHint>

        {canClientStream && (
          <ToolHint text={isConnectionActive ? t('GRPC_BODY.SEND_MESSAGE') : t('GRPC_BODY.CONNECTION_NOT_ACTIVE')} toolhintId={`send-msg-${index}`}>
            <button
              onClick={onSend}
              disabled={!isConnectionActive}
              className={`toolbar-btn ${!isConnectionActive ? 'disabled' : ''}`}
              data-testid={`grpc-send-message-${index}`}
            >
              <IconSend size={16} strokeWidth={1.5} />
            </button>
          </ToolHint>
        )}

        {showDelete && (
          <ToolHint text={t('GRPC_BODY.DELETE_MESSAGE')} toolhintId={`delete-msg-${index}`}>
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
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const editorRef = useRef(null);
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [grpcScroll, setGrpcScroll] = usePersistedState({ key: `request-grpc-msg-scroll-${item.uid}-${index}`, default: 0 });
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
        toast.success(t('GRPC_BODY.SAMPLE_GENERATED'));
      } else {
        toastError(new Error(result.error || t('GRPC_BODY.SAMPLE_GENERATE_FAILED')));
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
      toastError(new Error(t('REQUEST_BODY.PRETTIFY_JSON_ERROR')));
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
          ref={editorRef}
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
          initialScroll={grpcScroll}
          onScroll={setGrpcScroll}
        />
      </div>
    </div>
  );
};

const GrpcBody = ({ item, collection, handleRun }) => {
  const { t } = useTranslation();
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
          <p>{t('GRPC_BODY.NO_MESSAGES')}</p>
          <Button
            onClick={addNewMessage}
            variant="filled"
            color="secondary"
            size="sm"
            icon={<IconPlus size={14} strokeWidth={1.5} />}
          >
            {t('GRPC_BODY.ADD_MESSAGE')}
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
        data-testid="grpc-messages-container"
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
            data-testid="grpc-add-message-button"
          >
            {t('GRPC_BODY.ADD_MESSAGE')}
          </Button>
        </div>
      )}
    </StyledWrapper>
  );
};

export default GrpcBody;
