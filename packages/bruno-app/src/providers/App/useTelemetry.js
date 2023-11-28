import { useEffect } from 'react';
import getConfig from 'next/config';
import { PostHog } from 'posthog-node';
import platformLib from 'platform';
import { uuid } from '@utils/common';
import { isElectron } from '@utils/common/platform';

const { publicRuntimeConfig } = getConfig();
const posthogApiKey = 'phc_7gtqSrrdZRohiozPMLIacjzgHbUlhalW1Bu16uYijMR';
let posthogClient = null;

const isPlaywrightTestRunning = () => {
  return publicRuntimeConfig.PLAYWRIGHT ? true : false;
};

const isDevEnv = () => {
  return publicRuntimeConfig.ENV === 'dev';
};

// Todo support chrome and firefox extension
const getPlatform = () => {
  return isElectron() ? 'electron' : 'web';
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
  const platform = getPlatform();
  const client = getPosthogClient();
  client.capture({
    distinctId: trackingId,
    event: 'start',
    properties: {
      platform: platform,
      os: platformLib.os.family
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
