/**
 * Telemetry in bruno is just an anonymous visit counter (triggered once per day).
 * The only details shared are:
 *      - OS (ex: mac, windows, linux)
 *      - Bruno Version (ex: 1.3.0)
 * We don't track usage analytics / micro-interactions / crash logs / anything else.
 */

import { useEffect } from 'react';
import { PostHog } from 'posthog-node';
import platformLib from 'platform';
import { uuid } from 'utils/common';

const posthogApiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;
let posthogClient = null;
let wslUsageCapturedThisSession = false;

const isPlaywrightTestRunning = () => {
  return process.env.PLAYWRIGHT ? true : false;
};

const isDevEnv = () => {
  return import.meta.env.MODE === 'development';
};

const getPosthogClient = () => {
  if (posthogClient) {
    return posthogClient;
  }

  posthogClient = new PostHog(posthogApiKey);
  return posthogClient;
};

const getAnonymousTrackingId = () => {
  let id = localStorage.getItem('bruno.anonymousTrackingId');

  if (!id || !id.length || id.length !== 21) {
    id = uuid();
    localStorage.setItem('bruno.anonymousTrackingId', id);
  }

  return id;
};

const canTrack = () => {
  if (isPlaywrightTestRunning()) {
    return false;
  }

  if (isDevEnv()) {
    return false;
  }

  return Boolean(posthogApiKey && posthogApiKey.length);
};

const trackStart = (version) => {
  if (!canTrack()) {
    return;
  }

  const trackingId = getAnonymousTrackingId();
  const client = getPosthogClient();
  client.capture({
    distinctId: trackingId,
    event: 'start',
    properties: {
      os: platformLib.os.family,
      version: version
    }
  });
};

const markWSLCollectionOpened = () => {
  if (wslUsageCapturedThisSession || !canTrack()) {
    return;
  }

  wslUsageCapturedThisSession = true;

  const trackingId = getAnonymousTrackingId();
  const client = getPosthogClient();
  client.capture({
    distinctId: trackingId,
    event: 'wsl_collection_opened',
    properties: {
      os: platformLib.os.family,
      $set: { isWsl: true }
    }
  });
};

const useTelemetry = ({ version }) => {
  useEffect(() => {
    if (posthogApiKey && posthogApiKey.length) {
      trackStart(version);
      setInterval(trackStart, 24 * 60 * 60 * 1000);
    }
  }, [posthogApiKey]);
};

export { markWSLCollectionOpened };
export default useTelemetry;
