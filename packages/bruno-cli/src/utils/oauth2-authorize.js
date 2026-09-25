const http = require('node:http');
const readline = require('node:readline');
const { spawn } = require('node:child_process');

// Matches the Bruno app's system-browser authorization timeout
const AUTHORIZATION_TIMEOUT_MS = 5 * 60 * 1000;

// Error codes for sign-ins that ended without a callback, so callers need not parse messages
const AUTHORIZATION_ERROR_CODES = {
  CANCELLED: 'OAUTH2_AUTHORIZATION_CANCELLED',
  TIMED_OUT: 'OAUTH2_AUTHORIZATION_TIMED_OUT'
};

const createAuthorizationError = (code, message) => Object.assign(new Error(message), { code });

// Loopback addresses to listen on per callback hostname. Browsers may resolve `localhost` to either
// family, so both are bound; ::1 is optional because not every host has IPv6 loopback.
const LOOPBACK_ADDRESSES = {
  'localhost': [{ address: '127.0.0.1' }, { address: '::1', optional: true }],
  '127.0.0.1': [{ address: '127.0.0.1' }],
  '[::1]': [{ address: '::1' }]
};

// Bind failures meaning the platform lacks that address family, as opposed to a port already in use
const UNAVAILABLE_ADDRESS_ERRORS = ['EADDRNOTAVAIL', 'EAFNOSUPPORT'];

const NON_INTERACTIVE_MESSAGE = 'OAuth2 authorization code flow needs an interactive terminal to sign in through a browser. '
  + 'For non-interactive runs such as CI, pass a pre-fetched access token (for example with --env-var) '
  + 'or use a non-interactive grant such as client_credentials.';

// Static on purpose: echoing callback query values into this page would allow reflected XSS
const CALLBACK_RESPONSE_HTML = '<!doctype html><html><head><meta charset="utf-8"><title>Bruno</title></head>'
  + '<body><p>Authorization response received. You can close this tab and return to the terminal.</p></body></html>';

const isInteractiveSession = ({ stdin = process.stdin, env = process.env } = {}) => {
  const isCi = Boolean(env.CI) && env.CI !== 'false' && env.CI !== '0';
  return Boolean(stdin.isTTY) && !isCi;
};

/**
 * Returns the loopback callback the CLI can listen on, or null when the redirect lands elsewhere
 * (such as the Bruno-hosted callback page) and the user has to paste it back instead.
 */
const getLoopbackCallback = (callbackUrl) => {
  let url;
  try {
    url = new URL(callbackUrl);
  } catch {
    return null;
  }

  const addresses = LOOPBACK_ADDRESSES[url.hostname];
  if (url.protocol !== 'http:' || !addresses) {
    return null;
  }

  return { url, port: url.port === '' ? 80 : Number(url.port), addresses };
};

const getBrowserCommand = (url, platform) => {
  if (platform === 'darwin') {
    return { command: 'open', args: [url] };
  }
  // rundll32 takes the URL as a plain argument, avoiding cmd.exe parsing of `&` in query strings
  if (platform === 'win32') {
    return { command: 'rundll32', args: ['url.dll,FileProtocolHandler', url] };
  }
  return { command: 'xdg-open', args: [url] };
};

/**
 * Best-effort browser launch without a shell. Resolves false instead of throwing, since the
 * printed URL is always available as the fallback.
 */
const openBrowser = (url, { platform = process.platform, spawnProcess = spawn } = {}) => {
  return new Promise((resolve) => {
    const { protocol } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') {
      return resolve(false);
    }

    const { command, args } = getBrowserCommand(url, platform);
    try {
      const child = spawnProcess(command, args, { stdio: 'ignore', detached: true });
      child.once('error', () => resolve(false));
      child.once('spawn', () => {
        child.unref();
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
};

/**
 * Starts a one-shot listener for the configured loopback callback, on each of its loopback
 * addresses (never a public interface). `ready` resolves with the bound addresses; `callback`
 * resolves with the first valid redirect URL. Every server is closed on every outcome.
 */
const listenForLoopbackCallback = ({ url, port, addresses }, { timeoutMs = AUTHORIZATION_TIMEOUT_MS } = {}) => {
  let resolveCallback;
  let rejectCallback;
  const callback = new Promise((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });

  let settled = false;
  let callbackReceived = false;
  let timer;
  const servers = [];

  const finish = (error, callbackResponseUrl) => {
    if (settled) {
      return;
    }
    settled = true;
    clearTimeout(timer);
    servers.forEach((server) => {
      if (server.listening) {
        server.close();
        server.closeAllConnections();
      }
    });
    if (error) {
      rejectCallback(error);
    } else {
      resolveCallback(callbackResponseUrl);
    }
  };

  const handleRequest = (req, res) => {
    // Resolve against the configured callback, never the Host header
    const requestUrl = new URL(req.url, url);
    const isOAuthResponse = requestUrl.searchParams.has('code') || requestUrl.searchParams.has('error');

    if (settled || callbackReceived || req.method !== 'GET' || requestUrl.pathname !== url.pathname || !isOAuthResponse) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    // Only the first callback on any address is accepted; every listener shuts down once the page has been sent
    callbackReceived = true;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Connection': 'close' });
    res.end(CALLBACK_RESPONSE_HTML, () => finish(null, requestUrl.toString()));
  };

  // Resolves null when an optional address family is unavailable on this host
  const listenOn = ({ address, optional = false }) => new Promise((resolve, reject) => {
    const server = http.createServer(handleRequest);
    servers.push(server);
    server.once('error', (error) => {
      if (optional && UNAVAILABLE_ADDRESS_ERRORS.includes(error.code)) {
        return resolve(null);
      }
      reject(new Error(`Could not listen for the OAuth2 callback on ${url.origin}: ${error.message}`));
    });
    server.listen(port, address, () => resolve(server.address()));
  });

  // allSettled rather than all, so no bind is still pending when a failure closes the others
  const ready = Promise.allSettled(addresses.map(listenOn)).then((results) => {
    const failure = results.find((result) => result.status === 'rejected');
    if (failure) {
      finish(failure.reason);
      throw failure.reason;
    }

    timer = setTimeout(() => {
      finish(createAuthorizationError(
        AUTHORIZATION_ERROR_CODES.TIMED_OUT,
        `Timed out after ${Math.round(timeoutMs / 1000)}s waiting for the OAuth2 authorization callback`
      ));
    }, timeoutMs);
    return results.map((result) => result.value).filter(Boolean);
  });

  // Callers await `ready` first; this keeps an early listen failure from surfacing as an unhandled rejection
  callback.catch(() => {});

  return { ready, callback };
};

/**
 * Asks the user to paste the URL their browser landed on. The full URL is required (not just the
 * code) so the OAuth2 helper can validate its callback target and state.
 */
const promptForCallbackUrl = (callbackUrl, { input = process.stdin, output = process.stderr, timeoutMs = AUTHORIZATION_TIMEOUT_MS } = {}) => {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input, output, terminal: false });
    let settled = false;

    const timer = setTimeout(() => {
      settle(createAuthorizationError(
        AUTHORIZATION_ERROR_CODES.TIMED_OUT,
        `Timed out after ${Math.round(timeoutMs / 1000)}s waiting for the OAuth2 callback URL`
      ));
    }, timeoutMs);

    // rl.close() emits 'close' synchronously, so every outcome settles once here
    function settle(error, value) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      rl.close();
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    }

    output.write(`After signing in, paste the full URL from your browser's address bar (it starts with ${callbackUrl}):\n> `);

    rl.once('line', (line) => {
      let pastedUrl;
      try {
        pastedUrl = new URL(line.trim());
      } catch {
        return settle(new Error('The pasted value is not a valid URL. Paste the full callback URL, not only the code.'));
      }

      settle(null, pastedUrl.toString());
    });

    rl.once('close', () => {
      settle(createAuthorizationError(AUTHORIZATION_ERROR_CODES.CANCELLED, 'OAuth2 authorization cancelled: no callback URL was entered'));
    });
  });
};

/**
 * Creates the `authorize` handler used by the shared OAuth2 helper for the authorization code
 * grant: prints the authorization URL, tries to open the browser, then captures the redirect via a
 * loopback listener or, for non-local callback URLs, a pasted URL.
 */
const createCliAuthorizer = ({
  stdin = process.stdin,
  stderr = process.stderr,
  env = process.env,
  platform = process.platform,
  spawnProcess = spawn,
  timeoutMs = AUTHORIZATION_TIMEOUT_MS
} = {}) => async (authorizeUrl, { callbackUrl }) => {
  if (!isInteractiveSession({ stdin, env })) {
    throw new Error(NON_INTERACTIVE_MESSAGE);
  }

  const loopbackCallback = getLoopbackCallback(callbackUrl);
  // Listen before opening the browser so a fast redirect cannot arrive ahead of the server
  const listener = loopbackCallback ? listenForLoopbackCallback(loopbackCallback, { timeoutMs }) : null;
  if (listener) {
    await listener.ready;
  }

  stderr.write(`\nOAuth2: sign in to continue. If your browser does not open, visit:\n${authorizeUrl}\n\n`);
  await openBrowser(authorizeUrl, { platform, spawnProcess });

  if (listener) {
    return listener.callback;
  }
  return promptForCallbackUrl(callbackUrl, { input: stdin, output: stderr, timeoutMs });
};

module.exports = {
  AUTHORIZATION_ERROR_CODES,
  isInteractiveSession,
  getLoopbackCallback,
  getBrowserCommand,
  openBrowser,
  listenForLoopbackCallback,
  promptForCallbackUrl,
  createCliAuthorizer
};
