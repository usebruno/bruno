import { IconTrash, IconWand, IconSend, IconChevronRight, IconChevronDown } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor/index';
import ToolHint from 'components/ToolHint/index';
import { get } from 'lodash';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { queueWsMessage, isWsConnectionActive } from 'utils/network/index';
import { findCollectionByUid, findEnvironmentInCollection } from 'utils/collections/index';
import toast from 'react-hot-toast';
import { toastError } from 'utils/common/error';
import { prettifyJsonString } from 'utils/common/index';
import xmlFormat from 'xml-formatter';
import WSRequestBodyMode from '../BodyMode/index';
import StyledWrapper from './StyledWrapper';

// Maps stored type to display mode
const typeToMode = (type) => {
  switch (type) {
    case 'json': return 'json';
    case 'xml': return 'xml';
    default: return 'text';
  }
};

// Maps display mode back to stored type
const modeToType = (mode) => {
  switch (mode) {
    case 'json': return 'json';
    case 'xml': return 'xml';
    default: return 'text';
  }
};

export const SingleWSMessage = ({
  message,
  item,
  collection,
  index,
  handleRun,
  isExpanded,
  onToggle,
  isNew,
  onNewRendered
}) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const nameInputRef = useRef(null);

  const { name, content, type } = message;
  const displayMode = typeToMode(type);
  const displayName = name || `message ${index + 1}`;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName);

  // Auto-focus the name input when this is a newly created message
  useEffect(() => {
    if (isNew) {
      setIsEditing(true);
      setEditValue(displayName);
      onNewRendered();
    }
  }, [isNew]);

  // Focus the input when editing starts
  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditing]);

  const saveName = (value) => {
    const trimmed = value.trim() || `message ${index + 1}`;
    const currentMessages = [...(body.ws || [])];
    currentMessages[index] = {
      ...currentMessages[index],
      name: trimmed
    };
    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
    setIsEditing(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveName(editValue);
    } else if (e.key === 'Escape') {
      setEditValue(displayName);
      setIsEditing(false);
    }
  };

  const handleNameBlur = () => {
    saveName(editValue);
  };

  const clickTimerRef = useRef(null);

  const handleNameClick = useCallback((e) => {
    e.stopPropagation();
    if (clickTimerRef.current) {
      // Double click — cancel the pending single click toggle and enter edit mode
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setEditValue(displayName);
      setIsEditing(true);
    } else {
      // First click — wait to see if a second click comes
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        onToggle();
      }, 250);
    }
  }, [displayName, onToggle]);

  const fontSize = get(preferences, 'font.codeFontSize', 14);
  const lineHeight = fontSize * 1.5;
  const editorHeight = useMemo(() => {
    const lineCount = (content || '').split('\n').length;
    const lines = lineCount + 1;
    return `${lines * lineHeight + 10}px`;
  }, [content, lineHeight]);

  const onUpdateMessageType = (newMode) => {
    const currentMessages = [...(body.ws || [])];
    currentMessages[index] = {
      ...currentMessages[index],
      type: modeToType(newMode)
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
      ...currentMessages[index],
      name: name || `message ${index + 1}`,
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

  const onSendMessage = async () => {
    try {
      const state = dispatch((_, getState) => getState());
      const col = findCollectionByUid(state.collections.collections, collection.uid);
      const environment = findEnvironmentInCollection(col, col?.activeEnvironmentUid);

      const connectionStatus = await isWsConnectionActive(item.uid);
      if (!connectionStatus.isActive) {
        toast.error('WebSocket is not connected. Please connect first.');
        return;
      }

      const result = await queueWsMessage(item, col, environment, col?.runtimeVariables, content);
      if (!result.success) {
        toast.error(result.error || 'Failed to send message');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    }
  };

  const codemirrorMode = {
    text: 'application/text',
    xml: 'application/xml',
    json: 'application/ld+json'
  };

  const onPrettify = () => {
    if (displayMode === 'json') {
      try {
        const prettyBodyJson = prettifyJsonString(content);
        const currentMessages = [...(body.ws || [])];
        currentMessages[index] = {
          ...currentMessages[index],
          name: name || `message ${index + 1}`,
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

    if (displayMode === 'xml') {
      try {
        const prettyBodyXML = xmlFormat(content, { collapseContent: true });
        const currentMessages = [...(body.ws || [])];
        currentMessages[index] = {
          ...currentMessages[index],
          name: name || `message ${index + 1}`,
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
    <StyledWrapper>
      <div className="accordion-header" data-testid={`ws-message-header-${index}`} onClick={onToggle}>
        <div className="accordion-left">
          {isExpanded ? (
            <IconChevronDown size={14} strokeWidth={2} />
          ) : (
            <IconChevronRight size={14} strokeWidth={2} />
          )}
          {isEditing ? (
            <input
              ref={nameInputRef}
              className="name-input"
              data-testid={`ws-message-name-input-${index}`}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleNameKeyDown}
              onBlur={handleNameBlur}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="message-label" data-testid={`ws-message-label-${index}`} onClick={handleNameClick}>
              {displayName}
            </span>
          )}
        </div>
        <div className="accordion-actions" onClick={(e) => e.stopPropagation()}>
          <WSRequestBodyMode mode={displayMode} onModeChange={onUpdateMessageType} />
          <ToolHint text="Format" toolhintId={`prettify-msg-${index}`}>
            <button onClick={onPrettify} className="action-btn" data-testid={`ws-prettify-msg-${index}`}>
              <IconWand size={16} strokeWidth={1.5} />
            </button>
          </ToolHint>
          <ToolHint text="Send" toolhintId={`send-msg-${index}`}>
            <button onClick={onSendMessage} className="action-btn" data-testid={`ws-send-msg-${index}`}>
              <IconSend size={16} strokeWidth={1.5} />
            </button>
          </ToolHint>
          {index > 0 && (
            <ToolHint text="Delete" toolhintId={`delete-msg-${index}`}>
              <button onClick={onDeleteMessage} className="action-btn delete" data-testid={`ws-delete-msg-${index}`}>
                <IconTrash size={16} strokeWidth={1.5} />
              </button>
            </ToolHint>
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="accordion-body" data-testid={`ws-message-body-${index}`} style={{ height: editorHeight }}>
          <CodeEditor
            collection={collection}
            theme={displayedTheme}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
            value={content}
            onEdit={onEdit}
            onRun={handleRun}
            onSave={onSave}
            mode={codemirrorMode[displayMode] ?? 'text/plain'}
            enableVariableHighlighting={true}
          />
        </div>
      )}
    </StyledWrapper>
  );
};
