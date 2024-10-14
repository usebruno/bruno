/**
 * Telemetry in bruno is just an anonymous visit counter (triggered once per day).
 * The only details shared are:
 *      - OS (ex: mac, windows, linux)
 *      - Bruno Version (ex: 1.3.0)
 * We don't track usage analytics / micro-interactions / crash logs / anything else.
 */

import { useEffect } from 'react';
import getConfig from 'next/config';
import { PostHog } from 'posthog-node';
import platformLib from 'platform';
import { uuid } from 'utils/common';

const { publicRuntimeConfig } = getConfig();
const posthogApiKey = 'phc_7gtqSrrdZRohiozPMLIacjzgHbUlhalW1Bu16uYijMR';
let posthogClient = null;

const isPlaywrightTestRunning = () => {
  return publicRuntimeConfig.PLAYWRIGHT ? true : false;
};

const isDevEnv = () => {
  return publicRuntimeConfig.ENV === 'dev';
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

const trackStart = () => {
  if (isPlaywrightTestRunning()) {
    return;
  }

  if (isDevEnv()) {
    return;
  }

  const trackingId = getAnonymousTrackingId();
  const client = getPosthogClient();
  client.capture({
    distinctId: trackingId,
    event: 'start',
    properties: {
      os: platformLib.os.family,
      version: '1.33.0'
    }
  });
};

const useTelemetry = () => {
  useEffect(() => {
    trackStart();
    setInterval(trackStart, 24 * 60 * 60 * 1000);
  }, []);
};

export default useTelemetry;
