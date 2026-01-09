import { IconTrash, IconWand } from '@tabler/icons';
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
import { prettifyJsonString } from 'utils/common/index';
import xmlFormat from 'xml-formatter';
import WSRequestBodyMode from '../BodyMode/index';
import StyledWrapper from './StyledWrapper';

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
  handleRun,
  canClientSendMultipleMessages,
  isLast
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
        const prettyBodyJson = prettifyJsonString(content);
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

  const isSingleMessage = !canClientSendMultipleMessages || body.ws.length === 1;

  return (
    <StyledWrapper className={`message-container ${isSingleMessage ? 'single' : ''} ${isLast ? 'last' : ''}`}>
      <div className="message-toolbar">
        <span className="message-label">Message {index + 1}</span>
        <div className="toolbar-actions">
          <WSRequestBodyMode mode={messageFormat} onModeChange={onUpdateMessageType} />

          <ToolHint text="Format" toolhintId={`prettify-msg-${index}`}>
            <button onClick={onPrettify} className="toolbar-btn">
              <IconWand size={16} strokeWidth={1.5} />
            </button>
          </ToolHint>

          {index > 0 && (
            <ToolHint text="Delete message" toolhintId={`delete-msg-${index}`}>
              <button onClick={onDeleteMessage} className="toolbar-btn delete">
                <IconTrash size={16} strokeWidth={1.5} />
              </button>
            </ToolHint>
          )}
        </div>
      </div>
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
          mode={codemirrorMode[codeType] ?? 'text/plain'}
          enableVariableHighlighting={true}
        />
      </div>
    </StyledWrapper>
  );
};
