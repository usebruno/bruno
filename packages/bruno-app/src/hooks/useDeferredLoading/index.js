import { useState, useEffect, useRef } from 'react';

/**
 * A hook that defers showing loading state until a minimum delay has passed.
 * This prevents flickering UI for fast operations.
 *
 * @param {boolean} isLoading - The actual loading state
 * @param {number} delay - Minimum time (ms) before showing loading state (default: 200ms)
 * @returns {boolean} - The deferred loading state
 */
function useDeferredLoading(isLoading, delay = 200) {
  const [showLoading, setShowLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isLoading) {
      timerRef.current = setTimeout(() => {
        setShowLoading(true);
      }, delay);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setShowLoading(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading, delay]);

  return showLoading;
}

export default useDeferredLoading;
