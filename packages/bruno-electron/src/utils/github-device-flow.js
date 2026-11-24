const { setTimeout: sleep } = require('timers/promises');

const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const DEVICE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';
const SLOW_DOWN_INCREMENT_SECONDS = 5;
const REQUEST_TIMEOUT_MS = 15000;

const POLL_ERROR_MESSAGES = {
  expired_token: 'The sign-in code expired. Start the sign-in again.',
  access_denied: 'Sign-in was cancelled on GitHub.'
};

const deviceFlowError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const abortError = () => {
  const error = new Error('GitHub sign-in was cancelled.');
  error.name = 'AbortError';
  return error;
};

const wait = (ms, signal) => sleep(ms, undefined, { signal }).catch(() => {
  throw abortError();
});

const postForm = async (url, params, signal) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(params).toString(),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout
  });
  let body = null;
  try {
    body = await response.json();
  } catch (err) {
    body = null;
  }
  return { response, body };
};

const requestDeviceCode = async ({ clientId, scope }) => {
  const { response, body } = await postForm(DEVICE_CODE_URL, { client_id: clientId, scope });
  if (!response.ok || !body?.device_code) {
    const reason = body?.error_description || body?.error;
    throw deviceFlowError(
      body?.error || 'device_code_failed',
      reason ? `GitHub sign-in could not start: ${reason}` : `GitHub sign-in could not start (HTTP ${response.status})`
    );
  }
  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUri: body.verification_uri,
    expiresIn: body.expires_in,
    interval: body.interval
  };
};

const pollForToken = async ({ clientId, deviceCode, interval, expiresIn, signal }) => {
  let intervalSeconds = interval;
  const deadline = Date.now() + expiresIn * 1000;

  while (Date.now() < deadline) {
    await wait(intervalSeconds * 1000, signal);
    let result;
    try {
      result = await postForm(
        ACCESS_TOKEN_URL,
        { client_id: clientId, device_code: deviceCode, grant_type: DEVICE_GRANT_TYPE },
        signal
      );
    } catch (err) {
      if (signal?.aborted) throw abortError();
      continue;
    }
    const { response, body } = result;
    if (response.status >= 500) continue;

    if (body?.access_token) {
      return { accessToken: body.access_token };
    }

    const code = body?.error;
    if (code === 'authorization_pending') continue;
    if (code === 'slow_down') {
      intervalSeconds = body.interval || intervalSeconds + SLOW_DOWN_INCREMENT_SECONDS;
      continue;
    }
    throw deviceFlowError(
      code || 'token_failed',
      POLL_ERROR_MESSAGES[code] || body?.error_description || 'GitHub sign-in failed.'
    );
  }

  throw deviceFlowError('expired_token', POLL_ERROR_MESSAGES.expired_token);
};

module.exports = {
  requestDeviceCode,
  pollForToken
};
