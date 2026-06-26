import React, { useState, useRef, useEffect, useCallback, useMemo, forwardRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconX,
  IconPlayerStop,
  IconCheck,
  IconCode,
  IconWand,
  IconStars,
  IconCornerDownLeft,
  IconChevronDown,
  IconHistory,
  IconPlus,
  IconTrash
} from '@tabler/icons';
import get from 'lodash/get';
import find from 'lodash/find';
import MenuDropdown from 'ui/MenuDropdown';
import { focusTab } from 'providers/ReduxStore/slices/tabs';
import {
  closeAiSidebar,
  sendAiMessage,
  stopAiStream,
  setChatBinding,
  startNewConversation,
  refreshChatHistory,
  openConversation,
  removeConversation,
  setMessageCodeStatus
} from 'providers/ReduxStore/slices/chat';
import {
  updateAppCode,
  updateRequestTests,
  updateRequestScript,
  updateResponseScript,
  updateRequestDocs,
  updateFolderRequestScript,
  updateFolderResponseScript,
  updateFolderTests,
  updateFolderDocs,
  updateCollectionRequestScript,
  updateCollectionResponseScript,
  updateCollectionTests,
  updateCollectionDocs
} from 'providers/ReduxStore/slices/collections';
import { findItemInCollection, isItemAFolder, isItemARequest } from 'utils/collections';
import { getAiStatus } from 'utils/ai';

import StyledWrapper from './StyledWrapper';
import DiffView from './DiffView';
import AssistantCodeBlock from './AssistantCodeBlock';
import { PROCESSING_STAGES, CONTENT_TYPE_LABELS, SUGGESTIONS_BY_TYPE, PLACEHOLDER_BY_TYPE } from './constants';
import { renderMarkdown, parseMessageSegments } from './utils';

const SELECTED_MODEL_LS_KEY = 'bruno.ai.chat.selectedModel';
const AUTO_MODEL_ID = '';

const ToolActivityGroup = ({ activities }) => {
  if (!activities?.length) return null;
  const allDone = activities.every((a) => a.done);
  return (
    <div className={`tool-activity-log ${allDone ? 'completed' : ''}`}>
      {activities.map((activity, i) => (
        <div key={i} className={`tool-activity-item ${activity.done ? 'done' : 'active'}`}>
          <span className="tool-activity-indicator">
            {activity.done ? <IconCheck size={10} /> : <span className="tool-activity-spinner" />}
          </span>
          <span>{activity.label}{!activity.done ? '…' : ''}</span>
        </div>
      ))}
    </div>
  );
};

const buildMessageTimeline = (cleanedContent, activities) => {
  if (!activities?.length) {
    return cleanedContent ? [{ type: 'text', content: cleanedContent }] : [];
  }
  if (!cleanedContent) return [{ type: 'tools', activities }];

  const groups = [];
  for (const activity of activities) {
    const offset = Math.min(activity.textOffset || 0, cleanedContent.length);
    const last = groups[groups.length - 1];
    if (last && last.offset === offset) last.activities.push(activity);
    else groups.push({ offset, activities: [activity] });
  }

  const parts = [];
  let cursor = 0;
  for (const group of groups) {
    if (group.offset > cursor) {
      parts.push({ type: 'text', content: cleanedContent.substring(cursor, group.offset) });
    }
    parts.push({ type: 'tools', activities: group.activities });
    cursor = Math.max(cursor, group.offset);
  }
  if (cursor < cleanedContent.length) {
    parts.push({ type: 'text', content: cleanedContent.substring(cursor) });
  }
  return parts;
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

const HistoryPopover = ({ items, activeId, onPick, onDelete, onClose }) => {
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div className="history-popover" ref={popoverRef} role="menu">
      {items.length === 0 ? (
        <div className="history-popover__empty">No past conversations</div>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className={`history-popover__item ${item.id === activeId ? 'is-active' : ''}`}
            role="menuitem"
          >
            <button className="history-popover__title" onClick={() => onPick(item.id)} title={item.title}>
              <span className="history-popover__title-text">{item.title || '(untitled)'}</span>
              <span className="history-popover__meta">{formatRelativeTime(item.updatedAt)}</span>
            </button>
            <button
              className="history-popover__delete"
              onClick={(e) => {
                e.stopPropagation(); onDelete(item.id);
              }}
              title="Delete conversation"
              aria-label="Delete conversation"
            >
              <IconTrash size={12} />
            </button>
          </div>
        ))
      )}
    </div>
  );
};

const AiChatSidebar = ({ collection }) => {
  const dispatch = useDispatch();
  const [input, setInput] = useState('');
  const [processingStage, setProcessingStage] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(() => {
    try { return localStorage.getItem(SELECTED_MODEL_LS_KEY) ?? AUTO_MODEL_ID; } catch { return AUTO_MODEL_ID; }
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const textareaRef = useRef(null);

  const isOpen = useSelector((state) => state.chat.isOpen);
  const allChats = useSelector((state) => state.chat.chats);
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const preferences = useSelector((state) => state.app.preferences);
  const aiEnabled = get(preferences, 'ai.enabled', false);

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const activeItem = focusedTab && collection ? findItemInCollection(collection, activeTabUid) : null;

  const aiContext = useMemo(() => {
    if (!focusedTab || !collection) return null;
    if (activeItem && (isItemARequest(activeItem) || activeItem.type === 'app')) {
      return { kind: 'request', item: activeItem, pathname: activeItem.pathname || '', name: activeItem.name || 'Untitled' };
    }
    if (activeItem && isItemAFolder(activeItem)) {
      return { kind: 'folder', folder: activeItem, pathname: activeItem.pathname || '', name: activeItem.name || 'Untitled' };
    }
    // Anything else (collection-settings, runner, variables, openapi-sync,
    // .js files in File Mode …) falls back to the collection root so the AI
    // button always opens a useful chat instead of a no-op.
    return { kind: 'collection', pathname: collection.pathname || '', name: collection.name || 'Untitled Collection' };
  }, [focusedTab, collection, activeItem]);

  const currentChat = allChats[activeTabUid] || { messages: [], isLoading: false, error: null, historyList: [] };
  const { messages, isLoading, error, historyList, conversationId } = currentChat;

  useEffect(() => {
    if (!isOpen || !aiEnabled) return;
    let cancelled = false;
    getAiStatus()
      .then((status) => {
        if (cancelled) return;
        setAvailableModels(status?.availableModels || []);
      })
      .catch(() => {
        if (!cancelled) setAvailableModels([]);
      });
    return () => { cancelled = true; };
  }, [isOpen, aiEnabled, preferences?.ai]);

  // Auto = empty string. We don't auto-correct to the first model — let the
  // backend pick, so users get smart defaults that adapt as providers change.
  useEffect(() => {
    if (selectedModel === AUTO_MODEL_ID) return;
    if (availableModels.length === 0) return;
    if (availableModels.some((m) => m.id === selectedModel)) return;
    setSelectedModel(AUTO_MODEL_ID);
    try { localStorage.setItem(SELECTED_MODEL_LS_KEY, AUTO_MODEL_ID); } catch {}
  }, [availableModels, selectedModel]);

  const requestName = aiContext?.name || activeItem?.name || 'Untitled';
  const requestMethod = useMemo(() => {
    if (aiContext?.kind === 'folder') return 'FOLDER';
    if (aiContext?.kind === 'collection') return 'ROOT';
    if (!activeItem) return 'GET';
    if (activeItem.type === 'grpc-request') return 'GRPC';
    if (activeItem.type === 'ws-request') return 'WS';
    if (activeItem.type === 'graphql-request') return 'GQL';
    if (activeItem.type === 'app') return 'APP';
    const appOn = activeItem.draft
      ? get(activeItem, 'draft.app.enabled', false)
      : get(activeItem, 'app.enabled', false);
    if (appOn) return 'APP';
    return activeItem.draft
      ? get(activeItem, 'draft.request.method', 'GET')
      : get(activeItem, 'request.method', 'GET');
  }, [aiContext?.kind, activeItem]);

  // contentType drives the AI prompt, the diff target, and which entry of
  // allContent the backend treats as "active". For requests it follows the
  // request-pane tab. For folders / collections we read the settings sub-tab
  // (and the inner pre/post script split for the Script sub-tab).
  const requestPaneTab = focusedTab?.requestPaneTab;
  const scriptPaneTab = focusedTab?.scriptPaneTab;
  const contentType = useMemo(() => {
    if (aiContext?.kind === 'folder') {
      const sub = collection?.folderLevelSettingsSelectedTab?.[aiContext.folder.uid];
      if (sub === 'test') return 'tests';
      if (sub === 'docs') return 'docs';
      if (sub === 'script') return scriptPaneTab === 'post-response' ? 'post-response' : 'pre-request';
      return 'pre-request';
    }
    if (aiContext?.kind === 'collection') {
      const sub = collection?.settingsSelectedTab;
      if (sub === 'tests') return 'tests';
      if (sub === 'overview') return 'docs';
      if (sub === 'script') return scriptPaneTab === 'post-response' ? 'post-response' : 'pre-request';
      return 'pre-request';
    }
    switch (requestPaneTab) {
      case 'tests': return 'tests';
      case 'script': return scriptPaneTab === 'post-response' ? 'post-response' : 'pre-request';
      case 'docs': return 'docs';
      default: return 'app';
    }
  }, [aiContext, collection?.folderLevelSettingsSelectedTab, collection?.settingsSelectedTab, requestPaneTab, scriptPaneTab]);

  // Bind the chat to the active context's pathname so the history list
  // reflects this specific request/folder/collection and persistence keys stay
  // stable across sessions. Restoring the most recent conversation happens
  // once per tab — if the user explicitly starts a new chat, we don't
  // auto-replace it.
  const restoredOnceRef = useRef({});
  useEffect(() => {
    if (!isOpen || !aiContext || !collection) return;
    dispatch(setChatBinding({
      tabUid: activeTabUid,
      pathname: aiContext.pathname,
      collectionUid: collection.uid,
      contentType
    }));
    dispatch(refreshChatHistory(activeTabUid));
  }, [isOpen, aiContext?.pathname, collection?.uid, activeTabUid, contentType, dispatch]);

  // First-open restore: if this tab has no conversation yet and there's a
  // saved one for the same file, load the most recent.
  useEffect(() => {
    if (!isOpen || !activeTabUid) return;
    if (restoredOnceRef.current[activeTabUid]) return;
    if (currentChat.conversationId) return;
    if (currentChat.messages?.length > 0) return;
    if (!historyList || historyList.length === 0) return;
    restoredOnceRef.current[activeTabUid] = true;
    dispatch(openConversation(activeTabUid, historyList[0].id));
  }, [isOpen, activeTabUid, currentChat.conversationId, currentChat.messages?.length, historyList, dispatch]);

  const allContent = useMemo(() => {
    if (!aiContext) return {};
    if (aiContext.kind === 'request') {
      const item = aiContext.item;
      const draft = item.draft;
      const draftAppCode = get(item, 'draft.app.code');
      return {
        'app': draftAppCode != null ? draftAppCode : get(item, 'app.code', ''),
        'tests': draft ? get(draft, 'request.tests', '') : get(item, 'request.tests', ''),
        'pre-request': draft ? get(draft, 'request.script.req', '') : get(item, 'request.script.req', ''),
        'post-response': draft ? get(draft, 'request.script.res', '') : get(item, 'request.script.res', ''),
        'docs': draft ? get(draft, 'request.docs', '') : get(item, 'request.docs', '')
      };
    }
    if (aiContext.kind === 'folder') {
      const folder = aiContext.folder;
      const root = folder.draft || folder.root || {};
      return {
        'tests': get(root, 'request.tests', ''),
        'pre-request': get(root, 'request.script.req', ''),
        'post-response': get(root, 'request.script.res', ''),
        'docs': get(root, 'docs', '')
      };
    }
    // collection
    const root = collection?.draft?.root || collection?.root || {};
    return {
      'tests': get(root, 'request.tests', ''),
      'pre-request': get(root, 'request.script.req', ''),
      'post-response': get(root, 'request.script.res', ''),
      'docs': get(root, 'docs', '')
    };
  }, [aiContext, collection?.draft?.root, collection?.root]);

  const currentContent = allContent[contentType] || '';

  // requestContext (URL/method/headers/response shape) only makes sense for
  // HTTP-style request items. Folder, collection, and App chats skip it —
  // App items live under kind: 'request' but have no URL/method to surface.
  const requestContext = useMemo(() => {
    if (aiContext?.kind !== 'request' || !isItemARequest(aiContext.item)) return null;
    const item = aiContext.item;
    const draft = item.draft;
    return {
      url: draft ? get(item, 'draft.request.url', '') : get(item, 'request.url', ''),
      method: draft ? get(item, 'draft.request.method', '') : get(item, 'request.method', ''),
      headers: draft ? get(item, 'draft.request.headers', []) : get(item, 'request.headers', []),
      params: draft ? get(item, 'draft.request.params', []) : get(item, 'request.params', []),
      body: draft ? get(item, 'draft.request.body', null) : get(item, 'request.body', null),
      docs: draft ? get(item, 'draft.request.docs', null) : get(item, 'request.docs', null),
      responseStatus: get(item, 'response.status', null),
      responseData: get(item, 'response.data', null)
    };
  }, [aiContext]);

  const chatsWithMessages = useMemo(() => {
    if (!collection) return [];
    return Object.entries(allChats)
      .filter(([, chat]) => chat.messages?.length > 0)
      .map(([tabUid, chat]) => {
        if (tabUid === collection.uid) {
          return { id: tabUid, name: collection.name || 'Untitled Collection', method: 'ROOT', messageCount: chat.messages.length };
        }
        const item = findItemInCollection(collection, tabUid);
        if (!item) return null;
        if (isItemAFolder(item)) {
          return { id: tabUid, name: item.name || 'Untitled', method: 'FOLDER', messageCount: chat.messages.length };
        }
        const method = item.draft
          ? get(item, 'draft.request.method', 'GET')
          : get(item, 'request.method', 'GET');
        return {
          id: tabUid,
          name: item.name || 'Untitled',
          method,
          messageCount: chat.messages.length
        };
      })
      .filter(Boolean);
  }, [allChats, collection]);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  useEffect(() => {
    if (!isNearBottomRef.current) return;
    const behavior = messages.some((m) => m.isStreaming) ? 'auto' : 'smooth';
    scrollToBottom(behavior);
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) textareaRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isLoading) {
      setProcessingStage(null);
      return;
    }
    const last = messages[messages.length - 1];
    if (last?.isStreaming && last.content) setProcessingStage('generating');
    else if (last?.isStreaming) setProcessingStage('thinking');
    else setProcessingStage('sending');
  }, [isLoading, messages]);

  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 150) + 'px';
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || availableModels.length === 0) return;

    const text = input.trim();
    setInput('');
    setProcessingStage('sending');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      await dispatch(sendAiMessage(activeTabUid, text, allContent, requestContext, selectedModel, contentType));
      setProcessingStage('applying');
      setTimeout(() => setProcessingStage(null), 500);
    } catch (err) {
      console.error('Failed to send AI message:', err);
      setProcessingStage(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStop = () => {
    dispatch(stopAiStream(activeTabUid));
    setProcessingStage(null);
  };

  const handleApplyCode = (code, originalCode, messageIndex, msgContentType, writeIndex) => {
    if (!aiContext || code == null) return;
    const targetType = msgContentType || contentType;

    // Bail if the live buffer has drifted from what the AI based the diff on.
    // The DiffView already disables the button in this case, but guarding here
    // too means the keyboard / programmatic path can't blow away local edits.
    const liveContent = allContent[targetType] || '';
    if (originalCode != null && liveContent !== originalCode) {
      return;
    }

    if (aiContext.kind === 'request') {
      const payload = { itemUid: aiContext.item.uid, collectionUid: collection.uid };
      switch (targetType) {
        case 'tests': dispatch(updateRequestTests({ ...payload, tests: code })); break;
        case 'pre-request': dispatch(updateRequestScript({ ...payload, script: code })); break;
        case 'post-response': dispatch(updateResponseScript({ ...payload, script: code })); break;
        case 'docs': dispatch(updateRequestDocs({ ...payload, docs: code })); break;
        default: dispatch(updateAppCode({ ...payload, code })); break;
      }
    } else if (aiContext.kind === 'folder') {
      const payload = { folderUid: aiContext.folder.uid, collectionUid: collection.uid };
      switch (targetType) {
        case 'tests': dispatch(updateFolderTests({ ...payload, tests: code })); break;
        case 'pre-request': dispatch(updateFolderRequestScript({ ...payload, script: code })); break;
        case 'post-response': dispatch(updateFolderResponseScript({ ...payload, script: code })); break;
        case 'docs': dispatch(updateFolderDocs({ ...payload, docs: code })); break;
        // Folders / collections have no 'app' equivalent. Bail rather than
        // marking the diff accepted when nothing was dispatched.
        default: return;
      }
    } else {
      const payload = { collectionUid: collection.uid };
      switch (targetType) {
        case 'tests': dispatch(updateCollectionTests({ ...payload, tests: code })); break;
        case 'pre-request': dispatch(updateCollectionRequestScript({ ...payload, script: code })); break;
        case 'post-response': dispatch(updateCollectionResponseScript({ ...payload, script: code })); break;
        case 'docs': dispatch(updateCollectionDocs({ ...payload, docs: code })); break;
        default: return;
      }
    }

    dispatch(setMessageCodeStatus({
      tabUid: activeTabUid,
      messageIndex,
      status: 'accepted',
      writeIndex
    }));
  };

  const handleRejectCode = (messageIndex, writeIndex) => {
    dispatch(setMessageCodeStatus({
      tabUid: activeTabUid,
      messageIndex,
      status: 'rejected',
      writeIndex
    }));
  };

  const handleNewChat = () => {
    setHistoryOpen(false);
    restoredOnceRef.current[activeTabUid] = true; // suppress restore
    dispatch(startNewConversation({ tabUid: activeTabUid, contentType }));
    textareaRef.current?.focus();
  };

  const handlePickConversation = (id) => {
    setHistoryOpen(false);
    restoredOnceRef.current[activeTabUid] = true;
    dispatch(openConversation(activeTabUid, id));
  };

  const handleDeleteConversation = (id) => {
    dispatch(removeConversation(activeTabUid, id));
  };

  const handleClose = () => dispatch(closeAiSidebar());
  const handleSwitchChat = (tabUid) => dispatch(focusTab({ uid: tabUid }));

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    textareaRef.current?.focus();
  };

  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    try { localStorage.setItem(SELECTED_MODEL_LS_KEY, modelId); } catch {}
  };

  const selectedModelLabel = useMemo(() => {
    if (selectedModel === AUTO_MODEL_ID) return 'Auto';
    return availableModels.find((m) => m.id === selectedModel)?.label || 'Auto';
  }, [availableModels, selectedModel]);

  const ModelSelectorTrigger = forwardRef((props, ref) => (
    <div ref={ref} className="model-btn" {...props}>
      <IconStars size={14} strokeWidth={1.75} />
      <span>{selectedModelLabel}</span>
      <IconChevronDown size={12} />
    </div>
  ));
  ModelSelectorTrigger.displayName = 'ModelSelectorTrigger';

  const modelMenuItems = useMemo(
    () => [
      { id: AUTO_MODEL_ID, label: 'Auto', onClick: () => handleModelSelect(AUTO_MODEL_ID) },
      ...availableModels.map((model) => ({
        id: model.id,
        label: model.label,
        onClick: () => handleModelSelect(model.id)
      }))
    ],
    [availableModels]
  );

  const hasActiveStream = messages.some((m) => m.isStreaming);

  const renderProcessingIndicator = () => {
    if (!processingStage || processingStage === 'thinking' || hasActiveStream) return null;
    const stage = PROCESSING_STAGES.find((s) => s.id === processingStage) || PROCESSING_STAGES[0];
    return (
      <div className="processing-indicator">
        <div className="processing-content">
          <div className="processing-icon">
            {stage.icon === 'sparkles' && <IconStars size={12} />}
            {stage.icon === 'wand' && <IconWand size={12} />}
            {stage.icon === 'code' && <IconCode size={12} />}
            {stage.icon === 'send' && <IconCornerDownLeft size={12} />}
          </div>
          <span className="processing-label">{stage.label}</span>
          <div className="processing-dots"><span></span><span></span><span></span></div>
        </div>
        <div className="processing-bar"><div className="processing-bar-fill"></div></div>
      </div>
    );
  };

  const renderMessage = (msg, index) => {
    const isUser = msg.role === 'user';
    const isStreaming = msg.isStreaming;
    const activities = msg.toolActivity || [];
    const hasPendingTool = activities.some((a) => !a.done);
    const content = msg.content || '';

    const showThinking = isStreaming && !content && activities.length === 0;
    const showWorking = isStreaming && activities.length > 0 && !hasPendingTool;
    const timeline = buildMessageTimeline(content, activities);

    return (
      <div key={index} className={`message ${msg.role} ${isStreaming ? 'streaming' : ''}`}>
        <div className="message-content">
          {isUser ? content : (
            <>
              {showThinking && (
                <div className="message-status">
                  <span className="message-status__spinner" />
                  <span>Thinking…</span>
                </div>
              )}

              {timeline.map((part, partIndex) => {
                if (part.type === 'tools') {
                  return <ToolActivityGroup key={`tools-${partIndex}`} activities={part.activities} />;
                }
                const segments = parseMessageSegments(part.content);
                const isLastTextPart = !timeline.slice(partIndex + 1).some((p) => p.type === 'text');
                return (
                  <React.Fragment key={`text-${partIndex}`}>
                    {segments.map((segment, segIndex) => {
                      const isLastSegment = isLastTextPart && segIndex === segments.length - 1;
                      if (segment.type === 'code') {
                        return (
                          <AssistantCodeBlock
                            key={`p${partIndex}-s${segIndex}`}
                            content={segment.content}
                            language={segment.language}
                            isOpen={segment.isOpen}
                            isStreaming={isStreaming}
                            isLast={isLastSegment}
                          />
                        );
                      }
                      return (
                        <div key={`p${partIndex}-s${segIndex}`} className="prose markdown-body">
                          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(segment.content) }} />
                          {isStreaming && isLastSegment && <span className="cursor">|</span>}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {showWorking && (
                <div className="message-status">
                  <span className="message-status__spinner" />
                  <span>Working…</span>
                </div>
              )}

              {!isStreaming && msg.writes?.length > 0 && msg.writes.map((write, writeIdx) => {
                if (write.content === write.originalContent) return null;
                const liveContent = allContent[write.type] || '';
                const isStale = liveContent !== write.originalContent;
                const notRead = !write.wasRead;
                return (
                  <DiffView
                    key={`write-${writeIdx}`}
                    originalCode={write.originalContent || ''}
                    newCode={write.content}
                    contentTypeLabel={CONTENT_TYPE_LABELS[write.type] || write.type}
                    warning={
                      notRead ? 'Content was not read first — changes may overwrite unrelated edits'
                        : isStale ? 'Content has been modified since AI read it'
                          : null
                    }
                    disableAccept={isStale || notRead}
                    onAccept={() => handleApplyCode(write.content, write.originalContent, index, write.type, writeIdx)}
                    onReject={() => handleRejectCode(index, writeIdx)}
                    status={write.status}
                  />
                );
              })}

              {!isStreaming && !msg.writes && msg.code && msg.originalCode && msg.code !== msg.originalCode && (
                <DiffView
                  originalCode={msg.originalCode || ''}
                  newCode={msg.code}
                  onAccept={() => handleApplyCode(msg.code, msg.originalCode, index, msg.contentType)}
                  onReject={() => handleRejectCode(index)}
                  status={msg.codeStatus}
                />
              )}

              {!isStreaming && msg.cancelled && (
                <div className="message-cancelled"><em>Cancelled</em></div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderEmptyState = () => {
    const suggestions = SUGGESTIONS_BY_TYPE[contentType] || SUGGESTIONS_BY_TYPE.app;
    return (
      <div className="empty-state">
        <div className="empty-icon"><IconStars size={20} /></div>
        <h3>AI Assistant</h3>
        <p>Ask me to generate or modify code, tests, scripts, and docs.</p>
        <div className="suggestions">
          <p className="suggestions-title">Try asking:</p>
          <div className="suggestion-chips">
            {suggestions.map((s, i) => (
              <button key={i} className="suggestion-chip" onClick={() => handleSuggestionClick(s.prompt)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;
  if (!aiContext) return null;

  const placeholders = PLACEHOLDER_BY_TYPE[contentType] || PLACEHOLDER_BY_TYPE.app;
  const placeholder = currentContent ? placeholders.filled : placeholders.empty;
  const historyCount = historyList?.length || 0;

  return (
    <StyledWrapper>
      <div className="ai-sidebar">
        <div className="ai-sidebar-header">
          <div className="header-left">
            <IconStars size={18} className="header-icon" />
            <span className={`header-method method-${(requestMethod || 'get').toLowerCase()}`}>{requestMethod}</span>
            <span className="header-title">{requestName}</span>
            {chatsWithMessages.length > 1 && (
              <MenuDropdown
                items={chatsWithMessages.map((chat) => ({
                  id: chat.id,
                  label: `${chat.method} · ${chat.name}`,
                  onClick: () => handleSwitchChat(chat.id)
                }))}
                placement="bottom-start"
                selectedItemId={activeTabUid}
              >
                <button className="chat-switcher-btn" title="Switch chat">
                  <IconChevronDown size={14} />
                </button>
              </MenuDropdown>
            )}
          </div>
          <div className="header-actions">
            <button
              className="icon-btn"
              onClick={handleNewChat}
              title="New chat"
              disabled={isLoading || messages.length === 0}
            >
              <IconPlus size={14} />
            </button>
            <div className="history-wrap">
              <button
                className={`icon-btn ${historyOpen ? 'is-active' : ''}`}
                onClick={() => setHistoryOpen((v) => !v)}
                title="History"
                disabled={historyCount === 0}
              >
                <IconHistory size={14} />
              </button>
              {historyOpen && (
                <HistoryPopover
                  items={historyList || []}
                  activeId={conversationId}
                  onPick={handlePickConversation}
                  onDelete={handleDeleteConversation}
                  onClose={() => setHistoryOpen(false)}
                />
              )}
            </div>
            <button className="icon-btn close-btn" onClick={handleClose} title="Close">
              <IconX size={14} />
            </button>
          </div>
        </div>

        <div className="ai-sidebar-messages" ref={messagesContainerRef} onScroll={handleMessagesScroll}>
          {messages.length === 0 ? renderEmptyState() : (
            <>
              {messages.map(renderMessage)}
              {renderProcessingIndicator()}
            </>
          )}
          {error && (
            <div className="error-message">
              <div className="error-icon">!</div>
              <div className="error-text">{error}</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-sidebar-input">
          {availableModels.length === 0 ? (
            <div className="no-models-warning">
              No AI models available. Configure a provider and enable models in Preferences &gt; AI.
            </div>
          ) : (
            <div className="input-container">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isLoading}
                rows={1}
              />
              <div className="input-actions">
                <div className="model-selector">
                  <MenuDropdown items={modelMenuItems} placement="top-start" selectedItemId={selectedModel}>
                    <ModelSelectorTrigger />
                  </MenuDropdown>
                </div>
                {isLoading ? (
                  <button className="stop-btn" onClick={handleStop} title="Stop generating">
                    <IconPlayerStop size={12} /> Stop
                  </button>
                ) : (
                  <button
                    className="send-btn"
                    onClick={handleSubmit}
                    title="Send (Enter)"
                    disabled={!input.trim()}
                  >
                    Send <IconCornerDownLeft size={12} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default AiChatSidebar;
