import { IconTrash, IconChevronRight, IconChevronDown } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor/index';
import ToolHint from 'components/ToolHint/index';
import { get } from 'lodash';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  onNewRendered,
  isSelected,
  onSelect
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

  const codemirrorMode = {
    text: 'application/text',
    xml: 'application/xml',
    json: 'application/ld+json'
  };

  return (
    <StyledWrapper className={!isSelected ? 'disabled' : ''} onMouseDownCapture={onSelect}>
      <div
        className="accordion-header"
        data-testid={`ws-message-header-${index}`}
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
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
