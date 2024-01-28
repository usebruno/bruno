import { useState, useEffect } from 'react';
import JSONbig from 'json-bigint';
const JSONbigAsStr = JSONbig({ useNativeBigInt: true });
export default function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return JSONbigAsStr.parse(saved);
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    const rawValue = JSONbigAsStr.stringify(value);
    localStorage.setItem(key, rawValue);
  }, [key, value]);

  return [value, setValue];
}
