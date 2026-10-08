import { useEffect, useRef } from 'react';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';

export default function useRunnerScroll({ collectionUid, items, status, hasResults }) {
  const runnerBodyRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `runner-results-scroll-${collectionUid}`, default: 0 });
  const shouldAutoScrollRef = useRef(true);
  const lastScrollTopRef = useRef(scroll);
  const wasRunningRef = useRef(false);

  useTrackScroll({ ref: runnerBodyRef, onChange: setScroll, initialValue: scroll, enabled: hasResults });

  const handleRunnerBodyScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = runnerBodyRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 15;
    const isScrollingUp = scrollTop < lastScrollTopRef.current;
    lastScrollTopRef.current = scrollTop;

    if (isAtBottom) {
      shouldAutoScrollRef.current = true;
    } else if (isScrollingUp) {
      shouldAutoScrollRef.current = false;
    }
  };

  useEffect(() => {
    const container = runnerBodyRef.current;
    const isRunning = status === 'started';

    // Include the final results update, but leave completed runs at their restored position on mount.
    if (container && (isRunning || wasRunningRef.current) && shouldAutoScrollRef.current) {
      container.scrollTop = container.scrollHeight;
    }
    wasRunningRef.current = isRunning;
  }, [items, status]);

  const resetAutoScroll = () => {
    shouldAutoScrollRef.current = true;
    lastScrollTopRef.current = 0;
  };

  return { runnerBodyRef, handleRunnerBodyScroll, resetAutoScroll };
}
