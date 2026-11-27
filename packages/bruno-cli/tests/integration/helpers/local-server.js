const http = require('http');

// Nothing asserts on the response; the requests just need an endpoint that answers.
const respondOk = (_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
};

/**
 * Hands the request back as the response body, so a request's own `tests` block can assert on
 * what the run actually sent. The shape mirrors the testbench's /api/echo/everything
 * (packages/bruno-tests/src/index.js), which the Playwright suites run these fixtures against.
 *
 * @type {import('http').RequestListener}
 */
const echoRequest = (req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      method: req.method,
      url: req.url,
      query: Object.fromEntries(searchParams),
      headers: req.headers,
      body
    }));
  });
};

/**
 * Binds an HTTP server to an ephemeral port on the loopback interface.
 *
 * @param {import('http').RequestListener} [handler] - Defaults to a 200 `{ ok: true }`
 * @returns {Promise<{ baseUrl: string, close: () => Promise<void> }>}
 */
const startLocalServer = async (handler = respondOk) => {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
};

module.exports = { echoRequest, startLocalServer };
