import { callIpc } from 'utils/common/ipc';

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
