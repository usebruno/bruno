import { useEffect, useState } from 'react';

const IDLE = { status: 'idle', image: null, error: null };
const MAX_CACHED_LABELS = 20;

// Rendering goes to an external service, so identical requests share one call: the cache covers StrictMode's
// double-invoked effects and paging back to a label already rendered. Failures are dropped so a retry re-requests.
const renderCache = new Map();

const renderZplLabel = (params) => {
  const key = JSON.stringify(params);
  if (renderCache.has(key)) {
    return renderCache.get(key);
  }

  const rendering = window.ipcRenderer.invoke('renderer:render-zpl-label', params).then(
    (response) => {
      if (response.error) renderCache.delete(key);
      return response;
    },
    (err) => {
      renderCache.delete(key);
      throw err;
    }
  );

  renderCache.set(key, rendering);
  if (renderCache.size > MAX_CACHED_LABELS) {
    renderCache.delete(renderCache.keys().next().value);
  }
  return rendering;
};

// Renders one ZPL label through the main process; `enabled` gates the request until the user has consented.
// `endpoint` only keys the cache so a changed render endpoint never serves an image from the previous one.
export const useZplLabelImage = ({ zpl, dpmm, widthInches, heightInches, endpoint, enabled }) => {
  const [result, setResult] = useState(IDLE);

  useEffect(() => {
    if (!enabled || !zpl) {
      setResult(IDLE);
      return;
    }

    let cancelled = false;
    setResult({ status: 'loading', image: null, error: null });

    renderZplLabel({ zpl, dpmm, widthInches, heightInches, endpoint })
      .then((response) => {
        if (cancelled) return;
        setResult(response.error
          ? { status: 'error', image: null, error: response.message }
          : { status: 'ready', image: response.image, error: null });
      })
      .catch((err) => {
        if (!cancelled) setResult({ status: 'error', image: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [zpl, dpmm, widthInches, heightInches, endpoint, enabled]);

  return result;
};
