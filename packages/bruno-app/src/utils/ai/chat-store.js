import { openDB } from 'idb';

const DB_NAME = 'bruno-ai-chats';
const STORE = 'conversations';
const DB_VERSION = 1;

let dbPromise = null;

const getDb = () => {
  if (typeof indexedDB === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('pathname', 'pathname');
          store.createIndex('updatedAt', 'updatedAt');
        }
      }
    }).catch((err) => {
      console.warn('[AI] Failed to open chat history DB:', err);
      dbPromise = null;
      return null;
    });
  }
  return dbPromise;
};

/** Generate a stable conversation id without depending on uuid utilities. */
export const newConversationId = () =>
  `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Trimmed title built from the first user message. Empty if none. */
export const deriveTitle = (messages) => {
  const firstUser = messages.find((m) => m.role === 'user' && (m.content || '').trim());
  if (!firstUser) return '';
  const text = firstUser.content.trim().replace(/\s+/g, ' ');
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
};

/**
 * Strip transient streaming state before persisting. We don't want to write
 * partial assistant messages or in-flight tool spinners to disk.
 */
const sanitizeMessage = (msg) => {
  const out = {
    role: msg.role,
    content: msg.content || ''
  };
  if (msg.code) out.code = msg.code;
  if (msg.originalCode != null) out.originalCode = msg.originalCode;
  if (msg.contentType) out.contentType = msg.contentType;
  if (msg.codeStatus) out.codeStatus = msg.codeStatus;
  if (msg.cancelled) out.cancelled = true;
  if (msg.writes) {
    out.writes = msg.writes.map((w) => ({
      type: w.type,
      content: w.content,
      originalContent: w.originalContent,
      wasRead: w.wasRead,
      status: w.status
    }));
  }
  return out;
};

export const saveConversation = async (conversation) => {
  const db = await getDb();
  if (!db) return null;

  const record = {
    id: conversation.id,
    pathname: conversation.pathname || '',
    collectionUid: conversation.collectionUid || '',
    title: deriveTitle(conversation.messages || []),
    contentType: conversation.contentType || 'app',
    messages: (conversation.messages || [])
      .filter((m) => !m.isStreaming)
      .map(sanitizeMessage),
    createdAt: conversation.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  if (!record.messages.length) return null;

  try {
    await db.put(STORE, record);
    return record;
  } catch (err) {
    console.warn('[AI] Failed to save conversation:', err);
    return null;
  }
};

export const listConversationsForPath = async (pathname) => {
  if (!pathname) return [];
  const db = await getDb();
  if (!db) return [];

  try {
    const all = await db.getAllFromIndex(STORE, 'pathname', pathname);
    return all
      .map((c) => ({
        id: c.id,
        title: c.title || '(untitled)',
        contentType: c.contentType,
        messageCount: c.messages?.length || 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.warn('[AI] Failed to list conversations:', err);
    return [];
  }
};

export const loadConversation = async (id) => {
  if (!id) return null;
  const db = await getDb();
  if (!db) return null;
  try {
    return (await db.get(STORE, id)) || null;
  } catch (err) {
    console.warn('[AI] Failed to load conversation:', err);
    return null;
  }
};

export const deleteConversation = async (id) => {
  if (!id) return false;
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(STORE, id);
    return true;
  } catch (err) {
    console.warn('[AI] Failed to delete conversation:', err);
    return false;
  }
};
