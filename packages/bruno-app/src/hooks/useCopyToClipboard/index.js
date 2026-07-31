import { useCallback, useEffect, useRef, useState } from 'react';

const useCopyToClipboard = (resetDelay = 2000) => {
  const [copied, setCopied] = useState(false);
  const resetTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  const copy = useCallback((text) => {
    return navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      resetTimeoutRef.current = setTimeout(() => setCopied(false), resetDelay);
    });
  }, [resetDelay]);

  return [copied, copy];
};

export default useCopyToClipboard;
