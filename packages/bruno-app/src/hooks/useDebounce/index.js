import { useState, useEffect } from 'react';

/**
 *
 * @param {*} value
 * @param {number} delay - Debounce delay in milliseconds.
 * @param {object} [options]
 * @param {(value: *) => boolean} [options.skipDebounce] - Values matching
 *   this are applied immediately instead of being debounced.
 */
function useDebounce(value, delay, { skipDebounce } = {}) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const isImmediate = typeof skipDebounce === 'function' && skipDebounce(value);

  useEffect(() => {
    if (isImmediate) {
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
