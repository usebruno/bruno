const https = require('node:https');
const { Readable } = require('node:stream');
const { getCACertificates, getOrCreateHttpsAgent } = require('@usebruno/requests');
const { preferencesUtil } = require('../store/preferences');

const NULL_BODY_STATUSES = new Set([204, 205, 304]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const getCustomCaCertificateFilePath = () => {
  if (!preferencesUtil.shouldUseCustomCaCertificate()) return null;
  return preferencesUtil.getCustomCaCertificateFilePath() || null;
};

const toResponseHeaders = (rawHeaders) => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(rawHeaders)) {
    for (const item of [].concat(value)) {
      headers.append(name, item);
    }
  }
  return headers;
};

const redirectError = (url, location) => {
  const target = new URL(location, url).href;
  return new Error(`${url.origin} redirected the request to ${target}. Redirects are not followed when a custom CA certificate is in use. Update the URL to point to the final address.`);
};

const requestWithAgent = (url, init, agent) => new Promise((resolve, reject) => {
  const { signal } = init;
  if (signal?.aborted) {
    reject(signal.reason);
    return;
  }

  let response = null;
  const request = https.request(url, {
    method: init.method || 'GET',
    headers: Object.fromEntries(new Headers(init.headers)),
    agent
  });

  const onAbort = () => {
    if (response) response.destroy(signal.reason);
    request.destroy(signal.reason);
  };
  const stopListeningForAbort = () => {
    if (signal) signal.removeEventListener('abort', onAbort);
  };
  if (signal) signal.addEventListener('abort', onAbort, { once: true });

  request.on('error', (error) => {
    stopListeningForAbort();
    reject(error);
  });

  request.on('response', (incoming) => {
    const { statusCode, statusMessage, headers } = incoming;

    if (REDIRECT_STATUSES.has(statusCode) && headers.location) {
      stopListeningForAbort();
      incoming.resume();
      reject(redirectError(url, headers.location));
      return;
    }

    response = incoming;
    incoming.on('close', stopListeningForAbort);

    const hasBody = !NULL_BODY_STATUSES.has(statusCode);
    if (!hasBody) incoming.resume();

    resolve(new Response(hasBody ? Readable.toWeb(incoming) : null, {
      status: statusCode,
      statusText: statusMessage,
      headers: toResponseHeaders(headers)
    }));
  });

  request.end(init.body);
});

const fetchWithCustomCa = async (input, init = {}) => {
  const url = new URL(input);
  const caCertFilePath = getCustomCaCertificateFilePath();
  if (!caCertFilePath || url.protocol !== 'https:') {
    return fetch(input, init);
  }

  const { caCertificates } = getCACertificates({
    caCertFilePath,
    shouldKeepDefaultCerts: preferencesUtil.shouldKeepDefaultCaCertificates()
  });

  const reuseConnections = preferencesUtil.isSslSessionCachingEnabled();
  const agent = getOrCreateHttpsAgent({
    AgentClass: https.Agent,
    options: { ca: caCertificates, keepAlive: reuseConnections },
    disableCache: !reuseConnections,
    hostname: url.hostname
  });

  return requestWithAgent(url, init, agent);
};

module.exports = { fetchWithCustomCa };
