import { useEffect, useState, useCallback, useRef } from 'react';
import { getResponseBodyClient } from '../electron-ipc';
import { createWindowedTextModel } from '../../core/windowed-text';

/**
 * Sliding-window text for a bodyRef — only a few chunks stay in memory.
 * Scroll near bottom/top shifts the viewport and evicts the opposite end.
 */
export const useResponseBodyWindow = (bodyRef, { totalSize = 0, enabled = true } = {}) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [size, setSize] = useState(totalSize);
  const [hasMoreForward, setHasMoreForward] = useState(false);
  const [hasMoreBackward, setHasMoreBackward] = useState(false);
  const [scrollAnchor, setScrollAnchor] = useState({
    removedPrefixChars: 0,
    prependedChars: 0,
    token: 0
  });

  const modelRef = useRef(null);
  const hasMoreForwardRef = useRef(false);
  const hasMoreBackwardRef = useRef(false);
  const loadingRef = useRef(false);
  const tokenRef = useRef(0);

  const applySnapshot = (snapshot) => {
    setText(snapshot.text || '');
    setSize(snapshot.size);
    setHasMoreForward(Boolean(snapshot.hasMoreForward));
    setHasMoreBackward(Boolean(snapshot.hasMoreBackward));
    hasMoreForwardRef.current = Boolean(snapshot.hasMoreForward);
    hasMoreBackwardRef.current = Boolean(snapshot.hasMoreBackward);
    tokenRef.current += 1;
    setScrollAnchor({
      removedPrefixChars: snapshot.removedPrefixChars || 0,
      prependedChars: snapshot.prependedChars || 0,
      token: tokenRef.current
    });
  };

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !bodyRef) {
      setText('');
      setHasMoreForward(false);
      setHasMoreBackward(false);
      hasMoreForwardRef.current = false;
      hasMoreBackwardRef.current = false;
      return undefined;
    }

    const client = getResponseBodyClient();
    const model = createWindowedTextModel({ bodyRef, client, totalSize });
    modelRef.current = model;
    setLoading(true);
    loadingRef.current = true;
    setError(null);

    model
      .loadInitial()
      .then((result) => {
        if (cancelled) return;
        applySnapshot(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load response body');
      })
      .finally(() => {
        if (!cancelled) {
          loadingRef.current = false;
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bodyRef, totalSize, enabled]);

  const shift = useCallback(async (direction) => {
    if (!modelRef.current || loadingRef.current) {
      return;
    }
    if (direction === 'forward' && !hasMoreForwardRef.current) {
      return;
    }
    if (direction === 'backward' && !hasMoreBackwardRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    try {
      const result = direction === 'forward'
        ? await modelRef.current.shiftForward()
        : await modelRef.current.shiftBackward();
      applySnapshot(result);
    } catch (err) {
      setError(err?.message || 'Failed to load response window');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(() => shift('forward'), [shift]);
  const loadPrevious = useCallback(() => shift('backward'), [shift]);

  return {
    text,
    loading,
    error,
    size,
    hasMore: hasMoreForward,
    hasMoreForward,
    hasMoreBackward,
    scrollAnchor,
    loadMore,
    loadPrevious
  };
};
