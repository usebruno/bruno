type HopTiming = {
  /** Set only while a hop is in flight. */
  hopStartTime?: number;
  completedHopsTime?: number;
};

/**
 * Monotonic, unlike Date.now(), so a system clock adjustment mid-request can't skew a duration.
 * Meaningful only against another reading of this, never as a date.
 */
export const readCurrentTime = (): number => performance.now();

/** Whole milliseconds since `startTime`, a reading of `readCurrentTime`. */
export const measureTimeSince = (startTime: number): number => Math.round(readCurrentTime() - startTime);

export const startHop = (timing: HopTiming): void => {
  timing.hopStartTime = readCurrentTime();
};

/**
 * Closes the hop in flight and returns its duration, or undefined when no hop is open, so whichever
 * caller sees the hop finish first records it exactly once.
 */
export const completeHop = (timing: HopTiming): number | undefined => {
  if (timing.hopStartTime === undefined) {
    return undefined;
  }
  const hopTime = readCurrentTime() - timing.hopStartTime;
  timing.completedHopsTime = (timing.completedHopsTime ?? 0) + hopTime;
  delete timing.hopStartTime;
  return Math.round(hopTime);
};

/** Includes a hop still in flight, so for a streamed body call this after the body is consumed. */
export const measureResponseTime = (timing: HopTiming | undefined): number => {
  if (timing === undefined) {
    return 0;
  }
  const { completedHopsTime = 0, hopStartTime } = timing;
  const openHopTime = hopStartTime === undefined ? 0 : readCurrentTime() - hopStartTime;
  return Math.round(completedHopsTime + openHopTime);
};
