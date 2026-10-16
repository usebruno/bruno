// Uses the real HTTPSnippet (snippet-generator.spec.js mocks it), because the bug lives in how the
// display-swap in generateSnippet interacts with what each target actually prints.
import { generateSnippet } from './snippet-generator';

const collection = { root: { request: { auth: { mode: 'none' }, headers: [] } } };

const makeItem = (url, settings) => ({
  uid: 'path-less-url-req',
  request: {
    method: 'GET',
    url,
    headers: [],
    body: { mode: 'none' },
    auth: { mode: 'none' }
  },
  settings
});

const generate = (language, url, settings) =>
  generateSnippet({ language, item: makeItem(url, settings), collection, shouldInterpolate: false });

describe('generateSnippet – URL with a query but no path', () => {
  const url = 'http://example.com?x=1&y=2';

  // These targets print only the request target (path + query), which must start with `/`.
  const requestTargetCases = [
    ['http/http1.1', { target: 'http', client: 'http1.1' }, 'GET /?x=1&y=2 HTTP/1.1'],
    ['node/native', { target: 'node', client: 'native' }, 'path: \'/?x=1&y=2\''],
    ['python/python3', { target: 'python', client: 'python3' }, 'conn.request("GET", "/?x=1&y=2")']
  ];

  describe.each([false, true])('encodeUrl: %s', (encodeUrl) => {
    it.each(requestTargetCases)('keeps the leading slash of the request target for %s', async (_label, language, expected) => {
      const result = await generate(language, url, { encodeUrl });
      expect(result).toContain(expected);
    });
  });

  it('still shows the URL as typed where the snippet prints the full URL', async () => {
    const result = await generate({ target: 'shell', client: 'curl' }, url, { encodeUrl: false });
    expect(result).toContain('http://example.com?x=1&y=2');
  });

  it('does not change a URL that has a path', async () => {
    const result = await generate({ target: 'http', client: 'http1.1' }, 'http://example.com/api?x=1&y=2', { encodeUrl: false });
    expect(result).toContain('GET /api?x=1&y=2 HTTP/1.1');
  });
});
