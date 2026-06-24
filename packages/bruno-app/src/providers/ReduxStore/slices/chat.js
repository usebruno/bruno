import { createSlice } from '@reduxjs/toolkit';
import { closeTabs } from './tabs';
import {
  newConversationId,
  saveConversation,
  listConversationsForPath,
  loadConversation,
  deleteConversation
} from 'utils/ai/chat-store';

const initialState = {
  isOpen: false,
  chats: {}
};

const ensureChat = (state, tabUid) => {
  if (!state.chats[tabUid]) {
    state.chats[tabUid] = {
      conversationId: null,
      pathname: '',
      collectionUid: '',
      contentType: 'app',
      messages: [],
      isLoading: false,
      error: null,
      currentRequestId: null,
      // createdAt is stamped on first message in addAiMessage / startNewConversation
      // and preserved through openConversation so subsequent saves don't rewrite it.
      createdAt: null,
      historyList: []
    };
  }
  return state.chats[tabUid];
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    toggleAiSidebar: (state) => {
      state.isOpen = !state.isOpen;
    },
    openAiSidebar: (state) => {
      state.isOpen = true;
    },
    closeAiSidebar: (state) => {
      state.isOpen = false;
    },
    setChatBinding: (state, action) => {
      const { tabUid, pathname, collectionUid, contentType } = action.payload;
      const chat = ensureChat(state, tabUid);
      chat.pathname = pathname || '';
      chat.collectionUid = collectionUid || '';
      if (contentType) chat.contentType = contentType;
    },
    startNewConversation: (state, action) => {
      const { tabUid, contentType, createdAt } = action.payload;
      const chat = ensureChat(state, tabUid);
      chat.conversationId = newConversationId();
      chat.messages = [];
      chat.error = null;
      chat.createdAt = typeof createdAt === 'number' ? createdAt : null;
      if (contentType) chat.contentType = contentType;
    },
    addAiMessage: (state, action) => {
      const { tabUid, message } = action.payload;
      const chat = ensureChat(state, tabUid);
      if (!chat.conversationId) chat.conversationId = newConversationId();
      if (!chat.createdAt) chat.createdAt = action.payload.timestamp || null;
      chat.messages.push(message);
    },
    setAiLoading: (state, action) => {
      const { tabUid, isLoading } = action.payload;
      ensureChat(state, tabUid).isLoading = isLoading;
    },
    setCurrentRequestId: (state, action) => {
      const { tabUid, requestId } = action.payload;
      ensureChat(state, tabUid).currentRequestId = requestId;
    },
    setAiError: (state, action) => {
      const { tabUid, error } = action.payload;
      ensureChat(state, tabUid).error = error;
    },
    updateAiStreamingMessage: (state, action) => {
      const { tabUid, content } = action.payload;
      const chat = state.chats[tabUid];
      const last = chat?.messages[chat.messages.length - 1];
      if (last?.role === 'assistant' && last.isStreaming) {
        last.content = content;
      }
    },
    addAiToolActivity: (state, action) => {
      const { tabUid, toolName, label } = action.payload;
      const chat = state.chats[tabUid];
      const last = chat?.messages[chat.messages.length - 1];
      if (last?.role === 'assistant' && last.isStreaming) {
        if (!last.toolActivity) last.toolActivity = [];
        last.toolActivity.push({
          toolName,
          label,
          done: false,
          textOffset: last.content?.length || 0
        });
      }
    },
    markAiToolActivityDone: (state, action) => {
      const { tabUid } = action.payload;
      const chat = state.chats[tabUid];
      const last = chat?.messages[chat.messages.length - 1];
      if (last?.role === 'assistant' && last.toolActivity) {
        for (let i = last.toolActivity.length - 1; i >= 0; i--) {
          if (!last.toolActivity[i].done) {
            last.toolActivity[i].done = true;
            break;
          }
        }
      }
    },
    finalizeAiStreamingMessage: (state, action) => {
      const { tabUid, content, code, originalCode, contentType, writes, cancelled } = action.payload;
      const chat = state.chats[tabUid];
      const last = chat?.messages[chat.messages.length - 1];
      if (last?.role === 'assistant') {
        last.content = content;
        last.code = code;
        last.originalCode = originalCode;
        last.contentType = contentType || 'app';
        last.writes = writes || null;
        last.isStreaming = false;
        last.cancelled = Boolean(cancelled);
      }
    },
    markAiMessageCodeStatus: (state, action) => {
      const { tabUid, messageIndex, status, writeIndex } = action.payload;
      const message = state.chats[tabUid]?.messages[messageIndex];
      if (message?.role !== 'assistant') return;
      if (writeIndex !== undefined && message.writes?.[writeIndex]) {
        message.writes[writeIndex].status = status;
      } else {
        message.codeStatus = status;
      }
    },
    setChatHistoryList: (state, action) => {
      const { tabUid, historyList } = action.payload;
      const chat = ensureChat(state, tabUid);
      chat.historyList = Array.isArray(historyList) ? historyList : [];
    },
    replaceChatMessages: (state, action) => {
      const { tabUid, conversationId, messages, contentType, createdAt } = action.payload;
      const chat = ensureChat(state, tabUid);
      chat.conversationId = conversationId;
      chat.messages = messages || [];
      chat.error = null;
      chat.createdAt = typeof createdAt === 'number' ? createdAt : null;
      if (contentType) chat.contentType = contentType;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(closeTabs, (state, action) => {
      const tabUids = action.payload.tabUids || [];
      tabUids.forEach((uid) => { delete state.chats[uid]; });
    });
  }
});

export const {
  toggleAiSidebar,
  openAiSidebar,
  closeAiSidebar,
  setChatBinding,
  startNewConversation,
  addAiMessage,
  setAiLoading,
  setCurrentRequestId,
  setAiError,
  updateAiStreamingMessage,
  addAiToolActivity,
  markAiToolActivityDone,
  finalizeAiStreamingMessage,
  markAiMessageCodeStatus,
  setChatHistoryList,
  replaceChatMessages
} = chatSlice.actions;

const persistChat = async (chat) => {
  if (!chat?.conversationId || !chat.pathname) return;
  return saveConversation({
    id: chat.conversationId,
    pathname: chat.pathname,
    collectionUid: chat.collectionUid,
    contentType: chat.contentType,
    messages: chat.messages,
    createdAt: chat.createdAt
  });
};

/** Refresh the cached history list for the active tab from IndexedDB. */
export const refreshChatHistory = (tabUid) => async (dispatch, getState) => {
  const chat = getState().chat.chats[tabUid];
  if (!chat?.pathname) {
    dispatch(setChatHistoryList({ tabUid, historyList: [] }));
    return;
  }
  const list = await listConversationsForPath(chat.pathname);
  dispatch(setChatHistoryList({ tabUid, historyList: list }));
};

/** Load a saved conversation into the active tab. */
export const openConversation = (tabUid, conversationId) => async (dispatch) => {
  const record = await loadConversation(conversationId);
  if (!record) return;
  dispatch(replaceChatMessages({
    tabUid,
    conversationId: record.id,
    messages: record.messages || [],
    contentType: record.contentType,
    createdAt: record.createdAt
  }));
};

/** Delete a saved conversation. If it's the active one, also start fresh. */
export const removeConversation = (tabUid, conversationId) => async (dispatch, getState) => {
  await deleteConversation(conversationId);
  const chat = getState().chat.chats[tabUid];
  if (chat?.conversationId === conversationId) {
    dispatch(startNewConversation({ tabUid, contentType: chat.contentType }));
  }
  await dispatch(refreshChatHistory(tabUid));
};

/** Save the current conversation immediately. */
export const persistCurrentConversation = (tabUid) => async (_dispatch, getState) => {
  const chat = getState().chat.chats[tabUid];
  if (chat) await persistChat(chat);
};

export const sendAiMessage = (
  tabUid,
  userMessage,
  allContent,
  requestContext,
  model,
  contentType = 'app'
) => async (dispatch, getState) => {
  const { ipcRenderer } = window;

  // Reject overlapping sends for the same tab. The slice tracks one
  // currentRequestId per tab and chunk/tool reducers mutate the last
  // assistant message, so a concurrent send would interleave into the same
  // streaming entry and only the latest stop would target a controller.
  const existingChat = getState().chat.chats[tabUid];
  if (existingChat?.currentRequestId || existingChat?.isLoading) {
    return;
  }

  const now = Date.now();
  const requestId = `${tabUid}-${now}`;

  const existing = existingChat?.messages || [];
  const priorMessages = existing
    .filter((m) => !m.isStreaming)
    .map((m) => ({ role: m.role, content: m.content }));

  dispatch(addAiMessage({ tabUid, message: { role: 'user', content: userMessage }, timestamp: now }));
  dispatch(addAiMessage({ tabUid, message: { role: 'assistant', content: '', isStreaming: true }, timestamp: now }));
  dispatch(setAiLoading({ tabUid, isLoading: true }));
  dispatch(setCurrentRequestId({ tabUid, requestId }));
  dispatch(setAiError({ tabUid, error: null }));

  return new Promise((resolve, reject) => {
    const handleChunk = (data) => {
      if (data.requestId !== requestId) return;
      dispatch(updateAiStreamingMessage({ tabUid, content: data.fullText }));
    };

    const handleToolActivity = (data) => {
      if (data.requestId !== requestId) return;
      dispatch(addAiToolActivity({ tabUid, toolName: data.toolName, label: data.label }));
    };

    const handleToolDone = (data) => {
      if (data.requestId !== requestId) return;
      dispatch(markAiToolActivityDone({ tabUid }));
    };

    const finishLifecycle = async (final) => {
      dispatch(finalizeAiStreamingMessage(final));
      dispatch(setAiLoading({ tabUid, isLoading: false }));
      dispatch(setCurrentRequestId({ tabUid, requestId: null }));
      cleanup();
      // Persist after the reducer has applied so we capture the final state.
      await dispatch(persistCurrentConversation(tabUid));
      await dispatch(refreshChatHistory(tabUid));
    };

    const handleComplete = async (data) => {
      if (data.requestId !== requestId) return;
      let resolvedType;
      let resolvedOriginalCode;
      if (data.writes && data.writes.length > 0) {
        const primary = data.writes[data.writes.length - 1];
        resolvedType = primary.type;
        resolvedOriginalCode = primary.originalContent;
      } else {
        resolvedType = data.contentType || contentType;
        resolvedOriginalCode = typeof allContent === 'object'
          ? (allContent[resolvedType] || '')
          : allContent;
      }
      await finishLifecycle({
        tabUid,
        content: data.message,
        code: data.code,
        originalCode: resolvedOriginalCode,
        contentType: resolvedType,
        writes: data.writes || null
      });
      resolve();
    };

    const handleStopped = async (data) => {
      if (data.requestId !== requestId) return;
      const original = typeof allContent === 'object' ? (allContent[contentType] || '') : allContent;
      await finishLifecycle({
        tabUid,
        content: data.message,
        code: null,
        originalCode: original,
        contentType,
        cancelled: true
      });
      resolve();
    };

    const handleError = (data) => {
      if (data.requestId !== requestId) return;
      // Finalize the streaming assistant placeholder so the UI doesn't stay
      // stuck in "Thinking…", the error itself surfaces via setAiError.
      const original = typeof allContent === 'object' ? (allContent[contentType] || '') : allContent;
      dispatch(finalizeAiStreamingMessage({
        tabUid,
        content: '',
        code: null,
        originalCode: original,
        contentType,
        cancelled: true
      }));
      dispatch(setAiError({ tabUid, error: data.error }));
      dispatch(setAiLoading({ tabUid, isLoading: false }));
      dispatch(setCurrentRequestId({ tabUid, requestId: null }));
      cleanup();
      reject(new Error(data.error));
    };

    const unsubs = [
      ipcRenderer.on('main:ai-chat-chunk', handleChunk),
      ipcRenderer.on('main:ai-chat-tool-activity', handleToolActivity),
      ipcRenderer.on('main:ai-chat-tool-done', handleToolDone),
      ipcRenderer.on('main:ai-chat-complete', handleComplete),
      ipcRenderer.on('main:ai-chat-stopped', handleStopped),
      ipcRenderer.on('main:ai-chat-error', handleError)
    ];
    const cleanup = () => unsubs.forEach((u) => u && u());

    const messages = [
      ...priorMessages,
      { role: 'user', content: userMessage }
    ];

    const normalizedContent = typeof allContent === 'object'
      ? allContent
      : { [contentType]: allContent };

    ipcRenderer.send('renderer:ai-chat-stream', {
      messages,
      allContent: normalizedContent,
      contentType,
      requestContext,
      requestId,
      model
    });
  });
};

export const stopAiStream = (tabUid) => (_dispatch, getState) => {
  const { ipcRenderer } = window;
  const requestId = getState().chat.chats[tabUid]?.currentRequestId;
  if (requestId) {
    ipcRenderer.send('renderer:ai-chat-stop', { requestId });
  }
};

/**
 * Update the accept/reject status of a diff and persist the change so the
 * status sticks across restarts.
 */
export const setMessageCodeStatus = (params) => async (dispatch) => {
  dispatch(markAiMessageCodeStatus(params));
  await dispatch(persistCurrentConversation(params.tabUid));
};

export default chatSlice.reducer;
