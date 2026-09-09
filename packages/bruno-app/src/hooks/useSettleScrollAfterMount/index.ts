import { useRef } from 'react';

// Stop after a quiet period or the hard timeout, whichever comes first.
const QUIET_MS = 300;
const MAX_SETTLE_MS = 5000;

export type SettleHandle = {
  /** Stop watching immediately. */
  stop: () => void;
};

export type SettleScrollController = {
  /** Set scrollTop and mark the resulting scroll event as programmatic. */
  writeScrollTop: (el: HTMLElement, value: number) => void;

  /** Returns true for a scroll event caused by writeScrollTop. */
  consumeSuppressedScroll: () => boolean;

  /**
     * Restore `target` while async content is mounting.
     * Safe to call repeatedly; returns immediately when no settling is needed.
   */
  settle: (el: HTMLElement, target: number) => SettleHandle;
};

const NOOP_HANDLE: SettleHandle = { stop: () => {} };

/** Restores scroll position while asynchronously-mounted content settles. */
export function useSettleScrollAfterMount(): SettleScrollController {
  // Number of programmatic scroll events waiting to be ignored.
  const suppressCountRef = useRef(0);

  const writeScrollTop = (el: HTMLElement, value: number) => {
    // Only suppress the event if the assignment actually changes scrollTop.
    // Out-of-range values may be clamped to the current position.
    const before = el.scrollTop;
    el.scrollTop = value;
    if (el.scrollTop !== before) {
      suppressCountRef.current += 1;
    }
  };

  const consumeSuppressedScroll = () => {
    if (suppressCountRef.current > 0) {
      suppressCountRef.current -= 1;
      return true;
    }

    return false;
  };

  const settle = (el: HTMLElement, target: number): SettleHandle => {
    // Don't cache the settled state: this may run again after a remount or
    // effect re-run, and checking the current layout is cheap.
    if (target <= 0 || typeof MutationObserver === 'undefined') {
      return NOOP_HANDLE;
    }

    let mutationObserver: MutationObserver | null = null;
    let quietTimeout: ReturnType<typeof setTimeout> | null = null;
    let maxTimeout: ReturnType<typeof setTimeout> | null = null;

    const stop = () => {
      mutationObserver?.disconnect();
      mutationObserver = null;

      if (quietTimeout) clearTimeout(quietTimeout);
      quietTimeout = null;

      if (maxTimeout) clearTimeout(maxTimeout);
      maxTimeout = null;
    };

    // Don't restore until the container is tall enough to reach the target.
    const attemptRestore = (): boolean => {
      const maxScrollTop = el.scrollHeight - el.clientHeight;

      if (maxScrollTop < target - 1) {
        return false;
      }

      if (Math.abs(el.scrollTop - target) > 1) {
        writeScrollTop(el, target);
      }

      stop();
      return true;
    };

    if (!attemptRestore()) {
      mutationObserver = new MutationObserver(() => {
        if (attemptRestore()) return;

        // Reset the quiet timer whenever new content is added.
        if (quietTimeout) clearTimeout(quietTimeout);
        quietTimeout = setTimeout(stop, QUIET_MS);
      });

      // Only new nodes matter; attribute/text changes are too noisy.
      mutationObserver.observe(el, {
        childList: true,
        subtree: true
      });

      // Prevent the observer from running indefinitely.
      maxTimeout = setTimeout(stop, MAX_SETTLE_MS);
    }

    return { stop };
  };

  return { writeScrollTop, consumeSuppressedScroll, settle };
}
