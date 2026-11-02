import { useState, useEffect } from 'react';

/**
 *
 * @param {*} value
 * @param {number} delay - Debounce delay in milliseconds.
 * @param {object} [options]
 * @param {(value: *) => boolean} [options.shouldSkipDebounce] - Values matching
 *   this are applied immediately instead of being debounced.
 */
function useDebounce(value, delay, { shouldSkipDebounce } = {}) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const isImmediate = typeof shouldSkipDebounce === 'function' && shouldSkipDebounce(value);

  useEffect(() => {
    if (isImmediate) {
      // Keep the internal value in sync for the next debounced update.
      setDebouncedValue(value);
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, isImmediate]);

  return isImmediate ? value : debouncedValue;
}

export default useDebounce;
