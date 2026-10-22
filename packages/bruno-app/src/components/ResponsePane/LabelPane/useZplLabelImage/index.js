import { useEffect, useState } from 'react';

const IDLE = { status: 'idle', image: null, error: null };

// Renders one ZPL label through the main process; `enabled` gates the request until the user has consented.
export const useZplLabelImage = ({ zpl, dpmm, widthInches, heightInches, enabled }) => {
  const [result, setResult] = useState(IDLE);

  useEffect(() => {
    if (!enabled || !zpl) {
      setResult(IDLE);
      return;
    }

    let cancelled = false;
    setResult({ status: 'loading', image: null, error: null });

    window.ipcRenderer
      .invoke('renderer:render-zpl-label', { zpl, dpmm, widthInches, heightInches })
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
  }, [zpl, dpmm, widthInches, heightInches, enabled]);

  return result;
};
