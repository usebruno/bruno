import { callIpc } from 'utils/common/ipc';
import { isItemAFolder, isItemARequest, sortItemsBySidebarOrder } from 'utils/collections';

/**
 * Renderer-side wrapper around the AI IPC channels.
 *
 * The renderer never sees raw API keys, set/clear operations are write-only
 * and status reads only return whether a provider has a key on disk.
 */

export const getAiStatus = () => callIpc('renderer:get-ai-status');

export const setAiApiKey = ({ providerId, apiKey }) =>
  callIpc('renderer:set-ai-api-key', { providerId, apiKey });

export const clearAiApiKey = ({ providerId }) =>
  callIpc('renderer:clear-ai-api-key', { providerId });

export const getAiApiKey = ({ providerId }) =>
  callIpc('renderer:get-ai-api-key', { providerId });

export const testAiProvider = ({ providerId }) =>
  callIpc('renderer:ai-test-provider', { providerId });

export const aiGenerateText = (params) =>
  callIpc('renderer:ai-generate-text', params);

export const aiGenerateScript = (params) =>
  callIpc('renderer:ai-generate-script', params);

export const buildRequestContextFromItem = (item) => {
  if (!item) return null;
  const req = item.draft ? item.draft.request : item.request;
  if (!req) return null;

  return {
    url: req.url || '',
    method: req.method || 'GET',
    headers: Array.isArray(req.headers) ? req.headers : [],
    params: Array.isArray(req.params) ? req.params : [],
    body: req.body || null
  };
};

const summarizeDocsItems = (items = []) => {
  const folders = [];
  const requests = [];

  for (const item of sortItemsBySidebarOrder(items)) {
    if (item.isTransient) continue;

    if (isItemAFolder(item)) {
      const nestedItems = item.items || [];
      const nestedRequests = nestedItems.filter((i) => isItemARequest(i) && !i.isTransient);
      const nestedFolders = nestedItems.filter((i) => isItemAFolder(i) && !i.isTransient);
      folders.push({
        name: item.name,
        requestCount: nestedRequests.length,
        subfolderCount: nestedFolders.length
      });
      continue;
    }

    if (isItemARequest(item)) {
      const req = item.draft?.request || item.request;
      requests.push({
        name: item.name,
        method: req?.method || 'GET',
        url: req?.url || '',
        type: item.type
      });
    }
  }

  return { folders, requests };
};

export const buildDocsContextFromCollection = (collection) => {
  if (!collection) return null;

  const { folders, requests } = summarizeDocsItems(collection.items || []);

  return {
    scope: 'collection',
    name: collection.name || '',
    folders,
    requests
  };
};

export const buildDocsContextFromFolder = (collection, folder) => {
  if (!folder) return null;

  const { folders, requests } = summarizeDocsItems(folder.items || []);

  return {
    scope: 'folder',
    name: folder.name || '',
    collectionName: collection?.name || '',
    folders,
    requests
  };
};

/**
 * Start a streaming generation. Subscribes to the corresponding `main:ai-stream-*`
 * channels filtered by streamId. Returns a handle with `.stop()` and a promise
 * that resolves with the final text or rejects on error.
 */
export const aiStreamText = (params, handlers = {}) => {
  const { ipcRenderer } = window;
  if (!ipcRenderer) {
    return { stop: () => {}, done: Promise.reject(new Error('IPC not available')) };
  }

  const streamId = params.streamId || `stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const subs = [];

  const done = new Promise((resolve, reject) => {
    const cleanup = () => subs.forEach((unsub) => unsub());

    const onMatch = (channel, handler) => {
      const unsub = ipcRenderer.on(channel, (payload) => {
        if (payload?.streamId !== streamId) return;
        handler(payload);
      });
      subs.push(unsub);
    };

    onMatch('main:ai-stream-chunk', (payload) => {
      handlers.onChunk?.(payload);
    });
    onMatch('main:ai-stream-complete', (payload) => {
      handlers.onComplete?.(payload);
      cleanup();
      resolve(payload);
    });
    onMatch('main:ai-stream-stopped', (payload) => {
      handlers.onStopped?.(payload);
      cleanup();
      resolve(payload);
    });
    onMatch('main:ai-stream-error', (payload) => {
      handlers.onError?.(payload);
      cleanup();
      reject(new Error(payload.error));
    });
  });

  ipcRenderer.send('renderer:ai-stream-text', { ...params, streamId });

  return {
    streamId,
    stop: () => ipcRenderer.send('renderer:ai-stop-stream', { streamId }),
    done
  };
};
