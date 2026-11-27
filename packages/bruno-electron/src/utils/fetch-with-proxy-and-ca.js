const http = require('node:http');
const https = require('node:https');
const { Readable } = require('node:stream');
const { getHttpHttpsAgents } = require('@usebruno/requests');
const { preferencesUtil } = require('../store/preferences');
const { getCachedSystemProxy } = require('../store/system-proxy');

const NULL_BODY_STATUSES = new Set([204, 205, 304]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const getCustomCaCertificateFilePath = () => {
  if (!preferencesUtil.shouldUseCustomCaCertificate()) return null;
  return preferencesUtil.getCustomCaCertificateFilePath() || null;
};

const isProxyConfigured = (proxyPreferences, systemProxyConfig) => {
  if (proxyPreferences.disabled) return false;
  if (proxyPreferences.source === 'pac') return Boolean(proxyPreferences.pac?.source);
  if (proxyPreferences.source === 'manual') return Boolean(proxyPreferences.config?.hostname);
  return Boolean(systemProxyConfig?.http_proxy || systemProxyConfig?.https_proxy || systemProxyConfig?.pac_url);
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
  const target = new URL(location, url);
  return new Error(`${url.origin} redirected the request to ${target.origin}${target.pathname}. Redirects are not followed when a proxy or a custom CA certificate is in use. Update the URL to point to the final address.`);
};

const requestWithAgent = (url, init, agent) => new Promise((resolve, reject) => {
  const { signal } = init;
  if (signal?.aborted) {
    reject(signal.reason);
    return;
  }

  let response = null;
  const transport = url.protocol === 'https:' ? https : http;
  const request = transport.request(url, {
    method: init.method || 'GET',
    headers: Object.fromEntries(new Headers(init.headers)),
    agent
  });

  const onAbort = () => {
    if (response) response.destroy(signal.reason);
    request.destroy(signal.reason);
  };
  const finish = () => {
    if (signal) signal.removeEventListener('abort', onAbort);
    agent.destroy();
  };
  if (signal) signal.addEventListener('abort', onAbort, { once: true });

  request.on('error', (error) => {
    finish();
    reject(error);
  });

  request.on('response', (incoming) => {
    const { statusCode, statusMessage, headers } = incoming;

    if (REDIRECT_STATUSES.has(statusCode) && headers.location) {
      incoming.on('close', finish);
      incoming.resume();
      reject(redirectError(url, headers.location));
      return;
    }

    response = incoming;
    incoming.on('close', finish);

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

const fetchWithProxyAndCa = async (input, init = {}) => {
  const url = new URL(input);
  const isHttps = url.protocol === 'https:';
  const customCaFilePath = getCustomCaCertificateFilePath();
  const appLevelProxyConfig = preferencesUtil.getGlobalProxyConfig();
  const systemProxyConfig = appLevelProxyConfig.source === 'inherit' && !appLevelProxyConfig.disabled
    ? await getCachedSystemProxy()
    : undefined;

  const usesProxy = isProxyConfigured(appLevelProxyConfig, systemProxyConfig);
  const usesCustomCa = isHttps && Boolean(customCaFilePath);
  if (!usesProxy && !usesCustomCa) {
    return fetch(input, init);
  }

  const { httpAgent, httpsAgent } = await getHttpHttpsAgents({
    requestUrl: url.href,
    collectionPath: '',
    options: {
      noproxy: !usesProxy,
      shouldVerifyTls: true,
      shouldUseCustomCaCertificate: Boolean(customCaFilePath),
      customCaCertificateFilePath: customCaFilePath,
      shouldKeepDefaultCaCertificates: preferencesUtil.shouldKeepDefaultCaCertificates(),
      cacheSslSession: false
    },
    appLevelProxyConfig,
    systemProxyConfig
  });

  return requestWithAgent(url, init, isHttps ? httpsAgent : httpAgent);
};

module.exports = { fetchWithProxyAndCa };
