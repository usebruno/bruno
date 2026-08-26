import { getResponseBodyClient } from './client';

/**
 * Pin a bodyRef for timeline / active response retention (5A).
 * @returns {Promise<string|null>} pinId
 */
export const pinBodyRef = async (bodyRef) => {
  if (!bodyRef) return null;
  try {
    return await getResponseBodyClient().pin(bodyRef);
  } catch (err) {
    console.warn('Failed to pin response body:', err?.message || err);
    return null;
  }
};

/**
 * Release a pin (or unpinned bodyRef when refs === 0).
 */
export const releaseBodyPin = async (pinIdOrBodyRef) => {
  if (!pinIdOrBodyRef) return;
  try {
    await getResponseBodyClient().release(pinIdOrBodyRef);
  } catch (err) {
    console.warn('Failed to release response body pin:', err?.message || err);
  }
};

/**
 * Pin active response + timeline entry for a network response.
 * @returns {{ activePinId: string|null, timelinePinId: string|null }}
 */
export const pinResponseForTimeline = async (bodyRef) => {
  if (!bodyRef) {
    return { activePinId: null, timelinePinId: null };
  }
  const activePinId = await pinBodyRef(bodyRef);
  const timelinePinId = await pinBodyRef(bodyRef);
  return { activePinId, timelinePinId };
};

/**
 * Release pin ids from timeline entries (ignore missing).
 * Covers request timeline pins and scripted-request response pins.
 */
export const releaseTimelineBodyPins = async (timelineEntries = []) => {
  for (const entry of timelineEntries) {
    const pinIds = new Set([
      entry?.data?.bodyPinId,
      entry?.data?.response?.bodyPinId
    ].filter(Boolean));
    for (const pinId of pinIds) {
      await releaseBodyPin(pinId);
    }
  }
};
