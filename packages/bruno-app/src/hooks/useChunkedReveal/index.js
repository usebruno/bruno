import { useEffect, useRef, useState } from 'react';

const CHUNK_SIZE = 200;

/**
 * A node with a large number of children (e.g. a wide array) renders them in chunks
 * instead of all at once. A guardian element sits after the last rendered child, and
 * scrolling it into view reveals the next chunk - the same pattern as an infinite-scroll
 * list.
 */
export const useChunkedReveal = (total) => {
  const [visibleCount, setVisibleCount] = useState(Math.min(total, CHUNK_SIZE));
  const [prevTotal, setPrevTotal] = useState(total);
  if (total !== prevTotal) {
    setPrevTotal(total);
    setVisibleCount(Math.min(total, CHUNK_SIZE));
  }

  const sentinelRef = useRef(null);

  useEffect(() => {
    if (visibleCount >= total) return undefined;
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => Math.min(count + CHUNK_SIZE, total));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, total]);

  return [visibleCount, sentinelRef];
};
