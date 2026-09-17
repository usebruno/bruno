import { sentHeadersFromTimeline } from './index';

const header = (message) => ({ type: 'requestHeader', message });
const info = (message) => ({ type: 'info', message });
const responseHeader = (message) => ({ type: 'responseHeader', message });

const names = (rows) => rows.map((row) => row.name);
const valueOf = (rows, name) => rows.find((row) => row.name === name)?.value;

// One redirect hop as the network layer logs it: a request marker, its headers, then the response.
const hop = (url, host, startTime) => [
  { type: 'separator' },
  info(`Preparing request to ${url}`),
  { type: 'request', message: `GET ${url}` },
  header('Accept: application/json, text/plain, */*'),
  header('User-Agent: bruno-runtime/2.0.0'),
  header(`request-start-time: ${startTime}`),
  header('Accept-Encoding: gzip, compress, deflate, br'),
  header(`Host: ${host}`),
  header('Connection: keep-alive'),
  info('Proxy mode: system')
];

describe('sentHeadersFromTimeline', () => {
  const singleHop = [
    ...hop('http://localhost:6000/echo-request', 'localhost:6000', '1785918722100'),
    { type: 'response', message: 'HTTP/1.1 200 OK' },
    responseHeader('content-type: text/plain'),
    info('Request completed in 4 ms')
  ];

  test('returns every header of the request block in wire order', () => {
    expect(sentHeadersFromTimeline(singleHop)).toEqual([
      { name: 'Accept', value: 'application/json, text/plain, */*' },
      { name: 'User-Agent', value: 'bruno-runtime/2.0.0' },
      { name: 'request-start-time', value: '1785918722100' },
      { name: 'Accept-Encoding', value: 'gzip, compress, deflate, br' },
      { name: 'Host', value: 'localhost:6000' },
      { name: 'Connection', value: 'keep-alive' }
    ]);
  });

  test('ignores response headers and info entries', () => {
    expect(names(sentHeadersFromTimeline(singleHop))).not.toContain('content-type');
  });

  test('splits on the first colon so a value may contain colons', () => {
    expect(valueOf(sentHeadersFromTimeline(singleHop), 'Host')).toBe('localhost:6000');
  });

  // A cross-host redirect is the case that distinguishes the last block from the first: only the
  // final hop's headers reached the server that produced the response being shown.
  describe('followed redirect', () => {
    const redirected = [
      ...hop('http://localhost:6000/redirect-other-host', 'localhost:6000', '1785918722100'),
      { type: 'response', message: 'HTTP/1.1 302 Found' },
      responseHeader('location: http://127.0.0.1:6000/echo-request-redirect/hello'),
      info('Cross-origin redirect: stripping Authorization and Proxy-Authorization headers'),
      ...hop('http://127.0.0.1:6000/echo-request-redirect/hello', '127.0.0.1:6000', '1785918722104'),
      { type: 'response', message: 'HTTP/1.1 200 OK' },
      info('Request completed in 4 ms')
    ];

    test('reports the final hop, not the first', () => {
      const rows = sentHeadersFromTimeline(redirected);
      expect(valueOf(rows, 'Host')).toBe('127.0.0.1:6000');
      expect(valueOf(rows, 'request-start-time')).toBe('1785918722104');
    });

    test('does not concatenate the hops', () => {
      expect(names(sentHeadersFromTimeline(redirected)).filter((name) => name === 'Host')).toHaveLength(1);
    });

    test('omits a header the final hop did not send', () => {
      const withAuthOnFirstHopOnly = [
        { type: 'request', message: 'GET http://localhost:6000/a' },
        header('Authorization: Bearer secret'),
        header('Host: localhost:6000'),
        { type: 'response', message: 'HTTP/1.1 302 Found' },
        { type: 'request', message: 'GET http://127.0.0.1:6000/b' },
        header('Host: 127.0.0.1:6000'),
        { type: 'response', message: 'HTTP/1.1 200 OK' }
      ];
      expect(names(sentHeadersFromTimeline(withAuthOnFirstHopOnly))).toEqual(['Host']);
    });

    test('reports the last hop of a longer chain', () => {
      const threeHops = [
        { type: 'request', message: 'GET /one' },
        header('X-Hop: 1'),
        { type: 'response', message: 'HTTP/1.1 302 Found' },
        { type: 'request', message: 'GET /two' },
        header('X-Hop: 2'),
        { type: 'response', message: 'HTTP/1.1 302 Found' },
        { type: 'request', message: 'GET /three' },
        header('X-Hop: 3'),
        { type: 'response', message: 'HTTP/1.1 200 OK' }
      ];
      expect(sentHeadersFromTimeline(threeHops)).toEqual([{ name: 'X-Hop', value: '3' }]);
    });
  });

  test('handles a block that starts at the first entry', () => {
    expect(sentHeadersFromTimeline([header('A: 1'), header('B: 2')])).toEqual([
      { name: 'A', value: '1' },
      { name: 'B', value: '2' }
    ]);
  });

  test('handles a block that runs to the last entry', () => {
    const timeline = [{ type: 'request', message: 'GET /x' }, header('A: 1')];
    expect(sentHeadersFromTimeline(timeline)).toEqual([{ name: 'A', value: '1' }]);
  });

  test('keeps a header sent with an empty value', () => {
    const timeline = [{ type: 'request', message: 'GET /x' }, header('X-Empty:'), header('Host: x')];
    expect(sentHeadersFromTimeline(timeline)).toEqual([
      { name: 'X-Empty', value: '' },
      { name: 'Host', value: 'x' }
    ]);
  });

  test('skips entries whose message is unusable', () => {
    const timeline = [{ type: 'request', message: 'GET /x' }, header(undefined), header('garbage'), header('Host: x')];
    expect(sentHeadersFromTimeline(timeline)).toEqual([{ name: 'Host', value: 'x' }]);
  });

  test('returns an empty list when there is no request block', () => {
    expect(sentHeadersFromTimeline([])).toEqual([]);
    expect(sentHeadersFromTimeline([{ type: 'request', message: 'GET /x' }, info('no headers')])).toEqual([]);
  });

  test('returns an empty list when the timeline is not an array', () => {
    expect(sentHeadersFromTimeline(undefined)).toEqual([]);
    expect(sentHeadersFromTimeline(null)).toEqual([]);
    expect(sentHeadersFromTimeline({})).toEqual([]);
  });
});
