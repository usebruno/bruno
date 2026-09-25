const http = require('node:http');
const readline = require('node:readline');
const { spawn } = require('node:child_process');

// Matches the Bruno app's system-browser authorization timeout
const AUTHORIZATION_TIMEOUT_MS = 5 * 60 * 1000;

const LOOPBACK_HOSTNAMES = ['localhost', '127.0.0.1'];

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

  if (url.protocol !== 'http:' || !LOOPBACK_HOSTNAMES.includes(url.hostname)) {
    return null;
  }

  return { url, port: url.port === '' ? 80 : Number(url.port) };
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
 * Starts a one-shot listener for the configured loopback callback. `ready` resolves once it is
 * listening; `callback` resolves with the full redirect URL. The server is closed on every outcome.
 */
const listenForLoopbackCallback = ({ url, port }, { timeoutMs = AUTHORIZATION_TIMEOUT_MS } = {}) => {
  let resolveCallback;
  let rejectCallback;
  const callback = new Promise((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });

  let settled = false;
  let callbackReceived = false;
  let timer;

  const server = http.createServer();

  const finish = (error, callbackResponseUrl) => {
    if (settled) {
      return;
    }
    settled = true;
    clearTimeout(timer);
    if (server.listening) {
      server.close();
      server.closeAllConnections();
    }
    if (error) {
      rejectCallback(error);
    } else {
      resolveCallback(callbackResponseUrl);
    }
  };

  server.on('request', (req, res) => {
    // Resolve against the configured callback, never the Host header
    const requestUrl = new URL(req.url, url);
    const isOAuthResponse = requestUrl.searchParams.has('code') || requestUrl.searchParams.has('error');

    if (settled || callbackReceived || req.method !== 'GET' || requestUrl.pathname !== url.pathname || !isOAuthResponse) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    // Only the first callback is accepted; the listener shuts down once the page has been sent
    callbackReceived = true;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Connection': 'close' });
    res.end(CALLBACK_RESPONSE_HTML, () => finish(null, requestUrl.toString()));
  });

  const ready = new Promise((resolve, reject) => {
    server.once('error', (error) => {
      const listenError = new Error(`Could not listen for the OAuth2 callback on ${url.origin}: ${error.message}`);
      finish(listenError);
      reject(listenError);
    });

    server.listen(port, '127.0.0.1', () => {
      timer = setTimeout(() => {
        finish(new Error(`Timed out after ${Math.round(timeoutMs / 1000)}s waiting for the OAuth2 authorization callback`));
      }, timeoutMs);
      resolve(server.address());
    });
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
      settle(new Error(`Timed out after ${Math.round(timeoutMs / 1000)}s waiting for the OAuth2 callback URL`));
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
      settle(new Error('OAuth2 authorization cancelled: no callback URL was entered'));
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
  isInteractiveSession,
  getLoopbackCallback,
  getBrowserCommand,
  openBrowser,
  listenForLoopbackCallback,
  promptForCallbackUrl,
  createCliAuthorizer
};
