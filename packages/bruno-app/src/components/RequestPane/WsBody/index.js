import { get, invert } from 'lodash';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconChevronDown, IconChevronUp, IconPlus, IconTrash, IconWand } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor/index';
import ToolHint from 'components/ToolHint/index';
import { applyEdits, format } from 'jsonc-parser';
import xmlFormat from 'xml-formatter';
import { toastError } from 'utils/common/error';
import StyledWrapper from './StyledWrapper';
import WSRequestBodyMode from './BodyMode/index';
import { autoDetectLang } from 'utils/codemirror/lang-detect';

const TYPE_BY_DECODER = {
  base64: 'binary',
  json: 'json',
  xml: 'xml',
};

const DECODER_BY_TYPE = invert(TYPE_BY_DECODER);

const SingleWSMessage = ({
  message,
  item,
  collection,
  index,
  methodType,
  isCollapsed,
  onToggleCollapse,
  handleRun,
  canClientSendMultipleMessages,
}) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector(state => state.app.preferences);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');

  const { name, content, type } = message;
  const [messageFormat, setMessageFormat] = useState(autoDetectLang(content));

  const onUpdateMessageType = type => {
    setMessageFormat(type);

    const currentMessages = [...(body.ws || [])];

    currentMessages[index] = {
      ...currentMessages[index],
      type: DECODER_BY_TYPE[type],
    };

    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid,
    }));
  };

  const onEdit = value => {
    const currentMessages = [...(body.ws || [])];

    currentMessages[index] = {
      name: name ? name : `message ${index + 1}`,
      type: DECODER_BY_TYPE[messageFormat],
      content: value,
    };

    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid,
    }));
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const onDeleteMessage = () => {
    const currentMessages = [...(body.ws || [])];

    currentMessages.splice(index, 1);

    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid,
    }));
  };

  const getContainerHeight
    = canClientSendMultipleMessages && body.ws.length > 1 ? `${isCollapsed ? '' : 'h-80'}` : 'h-full';

  let codeType = messageFormat;
  if (TYPE_BY_DECODER[type]) {
    codeType = TYPE_BY_DECODER[type];
  }

  const codemirrorMode = {
    text: 'application/text',
    xml: 'application/xml',
    json: 'application/ld+json',
  };

  const onPrettify = () => {
    if (codeType === 'json') {
      try {
        const edits = format(content, undefined, { tabSize: 2, insertSpaces: true });
        const prettyBodyJson = applyEdits(content, edits);

        const currentMessages = [...(body.ws || [])];
        currentMessages[index] = {
          ...currentMessages[index],
          name: name ? name : `message ${index + 1}`,
          content: prettyBodyJson,
        };
        dispatch(updateRequestBody({
          content: currentMessages,
          itemUid: item.uid,
          collectionUid: collection.uid,
        }));
      } catch (e) {
        toastError(new Error('Unable to prettify. Invalid JSON format.'));
      }
    }

    if (codeType === 'xml') {
      try {
        const prettyBodyXML = xmlFormat(content, { collapseContent: true });

        const currentMessages = [...(body.ws || [])];
        currentMessages[index] = {
          ...currentMessages[index],
          name: name ? name : `message ${index + 1}`,
          content: prettyBodyXML,
        };

        dispatch(updateRequestBody({
          content: currentMessages,
          itemUid: item.uid,
          collectionUid: collection.uid,
        }));
      } catch (e) {
        toastError(new Error('Unable to prettify. Invalid XML format.'));
      }
    }
  };

  return (
    <div
      className={`flex flex-col mb-3 border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden ${getContainerHeight} relative`}
    >
      <div
        className="ws-message-header flex items-center justify-between px-3 py-2 bg-neutral-100 dark:bg-neutral-700 cursor-pointer"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <IconChevronDown size={16} strokeWidth={1.5} className="text-zinc-700 dark:text-zinc-300" />
          ) : (
            <IconChevronUp size={16} strokeWidth={1.5} className="text-zinc-700 dark:text-zinc-300" />
          )}
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <WSRequestBodyMode mode={messageFormat} onModeChange={onUpdateMessageType} />
          <ToolHint text="Prettify" toolhintId={`prettify-msg-${index}`}>
            <button
              onClick={onPrettify}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
            >
              <IconWand size={16} strokeWidth={1.5} className="text-zinc-700 dark:text-zinc-300" />
            </button>
          </ToolHint>

          {index > 0 && (
            <ToolHint text="Delete this message" toolhintId={`delete-msg-${index}`}>
              <button
                onClick={onDeleteMessage}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
              >
                <IconTrash size={16} strokeWidth={1.5} className="text-zinc-700 dark:text-zinc-300" />
              </button>
            </ToolHint>
          )}
        </div>
      </div>
      {!isCollapsed && (
        <div className={`flex ${body.ws.length === 1 || !canClientSendMultipleMessages ? 'h-full' : 'h-80'} relative`}>
          <CodeEditor
            collection={collection}
            theme={displayedTheme}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
            value={content}
            onEdit={onEdit}
            onRun={handleRun}
            onSave={onSave}
            mode={codemirrorMode[codeType] ?? 'text/plain'}
            enableVariableHighlighting={true}
          />
        </div>
      )}
    </div>
  );
};

const WSBody = ({ item, collection, handleRun }) => {
  const preferences = useSelector(state => state.app.preferences);
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

  const toggleMessageCollapse = index => {
    setCollapsedMessages(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const addNewMessage = () => {
    const currentMessages = Array.isArray(body.ws) ? [...body.ws] : [];

    currentMessages.push({
      name: `message ${currentMessages.length + 1}`,
      content: '{}',
    });

    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid,
    }));
  };

  if (!body?.ws || !Array.isArray(body.ws)) {
    return (
      <StyledWrapper isVerticalLayout={isVerticalLayout}>
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">No WebSocket messages available</p>
          <ToolHint text="Add the first message to your WebSocket request" toolhintId="add-first-msg">
            <button
              onClick={addNewMessage}
              className="flex items-center justify-center gap-2 py-2 px-4 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              <IconPlus size={16} strokeWidth={1.5} className="text-neutral-700 dark:text-neutral-300" />
              <span className="font-medium text-sm text-neutral-700 dark:text-neutral-300">Add First Message</span>
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
              className="add-message-btn flex items-center justify-center gap-2 py-2 px-4 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors shadow-md"
            >
              <IconPlus size={16} strokeWidth={1.5} className="text-neutral-700 dark:text-neutral-300" />
              <span className="font-medium text-sm text-neutral-700 dark:text-neutral-300">Add Message</span>
            </button>
          </ToolHint>
        </div>
      )}
    </StyledWrapper>
  );
};

export default WSBody;
