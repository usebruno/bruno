import { IconChevronDown, IconChevronUp, IconTrash, IconWand } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor/index';
import ToolHint from 'components/ToolHint/index';
import { get } from 'lodash';
import invert from 'lodash/invert';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { autoDetectLang } from 'utils/codemirror/lang-detect';
import { toastError } from 'utils/common/error';
import fastJsonFormat from 'fast-json-format';
import xmlFormat from 'xml-formatter';
import WSRequestBodyMode from '../BodyMode/index';

export const TYPE_BY_DECODER = {
  base64: 'binary',
  json: 'json',
  xml: 'xml'
};

export const DECODER_BY_TYPE = invert(TYPE_BY_DECODER);

export const SingleWSMessage = ({
  message,
  item,
  collection,
  index,
  methodType,
  isCollapsed,
  onToggleCollapse,
  handleRun,
  canClientSendMultipleMessages
}) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');

  const { name, content, type } = message;
  const [messageFormat, setMessageFormat] = useState(autoDetectLang(content));

  const onUpdateMessageType = (type) => {
    setMessageFormat(type);

    const currentMessages = [...(body.ws || [])];

    currentMessages[index] = {
      ...currentMessages[index],
      type: DECODER_BY_TYPE[type]
    };

    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  const onEdit = (value) => {
    const currentMessages = [...(body.ws || [])];

    currentMessages[index] = {
      name: name ? name : `message ${index + 1}`,
      type: DECODER_BY_TYPE[messageFormat],
      content: value
    };

    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const onDeleteMessage = () => {
    const currentMessages = [...(body.ws || [])];

    currentMessages.splice(index, 1);

    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
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
    json: 'application/ld+json'
  };

  const onPrettify = () => {
    if (codeType === 'json') {
      try {
        const prettyBodyJson = fastJsonFormat(content);
        const currentMessages = [...(body.ws || [])];
        currentMessages[index] = {
          ...currentMessages[index],
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
    }

    if (codeType === 'xml') {
      try {
        const prettyBodyXML = xmlFormat(content, { collapseContent: true });

        const currentMessages = [...(body.ws || [])];
        currentMessages[index] = {
          ...currentMessages[index],
          name: name ? name : `message ${index + 1}`,
          content: prettyBodyXML
        };

        dispatch(updateRequestBody({
          content: currentMessages,
          itemUid: item.uid,
          collectionUid: collection.uid
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
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
