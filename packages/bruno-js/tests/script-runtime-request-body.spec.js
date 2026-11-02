const { describe, it, expect, beforeAll } = require('@jest/globals');
const ScriptRuntime = require('../src/runtime/script-runtime');
const { loader: quickJsLoader } = require('../src/sandbox/quickjs');

const MULTIPART_MIXED_CONTENT_TYPE = 'multipart/mixed; boundary="b123"';
// A NUL, a byte that isn't valid UTF-8 and a CRLF: none of them survive being passed as a string
const BINARY_BYTES = [0x00, 0x01, 0xff, 0x0d, 0x0a];

const makeRequest = (overrides = {}) => ({
  method: 'POST',
  url: 'http://localhost:3000/upload',
  headers: { 'content-type': MULTIPART_MIXED_CONTENT_TYPE },
  data: undefined,
  ...overrides
});

const runRequestScript = (runtime, script, request) => {
  const onConsoleLog = () => {};
  return new ScriptRuntime({ runtime }).runRequestScript(script, request, {}, {}, '.', onConsoleLog, {});
};

describe.each(['nodevm', 'quickjs'])('req.setBody() in a pre-request script on %s', (runtime) => {
  beforeAll(async () => {
    if (runtime === 'quickjs') {
      await quickJsLoader();
    }
  });

  it('keeps every byte of a Buffer body set with { raw: true }', async () => {
    const request = makeRequest();

    await runRequestScript(runtime, `req.setBody(Buffer.from(${JSON.stringify(BINARY_BYTES)}), { raw: true })`, request);

    expect(request.data).toStrictEqual(Buffer.from(BINARY_BYTES));
  });

  it('keeps every byte of a Buffer body set without options', async () => {
    const request = makeRequest();

    await runRequestScript(runtime, `req.setBody(Buffer.from(${JSON.stringify(BINARY_BYTES)}))`, request);

    expect(request.data).toStrictEqual(Buffer.from(BINARY_BYTES));
  });

  it('keeps every byte of a Buffer body set without options when Content-Type is application/json', async () => {
    const request = makeRequest({ headers: { 'content-type': 'application/json' } });

    await runRequestScript(runtime, `req.setBody(Buffer.from(${JSON.stringify(BINARY_BYTES)}))`, request);

    expect(request.data).toStrictEqual(Buffer.from(BINARY_BYTES));
  });

  it('keeps only the bytes inside a sliced Buffer body', async () => {
    const request = makeRequest();

    await runRequestScript(runtime, `req.setBody(Buffer.from('--part--').subarray(2, 6))`, request);

    expect(request.data).toStrictEqual(Buffer.from('part'));
  });

  it('keeps an empty Buffer body as an empty Buffer', async () => {
    const request = makeRequest();

    await runRequestScript(runtime, `req.setBody(Buffer.alloc(0))`, request);

    expect(request.data).toStrictEqual(Buffer.alloc(0));
  });

  it('keeps a string body unchanged', async () => {
    const request = makeRequest();

    await runRequestScript(runtime, `req.setBody('plain text')`, request);

    expect(request.data).toBe('plain text');
  });

  it('serializes an object body to JSON when Content-Type is application/json', async () => {
    const request = makeRequest({ headers: { 'content-type': 'application/json' } });

    await runRequestScript(runtime, `req.setBody({ name: 'bruno' })`, request);

    expect(request.data).toBe('{"name":"bruno"}');
  });

  it('clears the body when called without a value', async () => {
    const request = makeRequest({ data: 'initial' });

    await runRequestScript(runtime, `req.setBody()`, request);

    expect(request.data).toBeUndefined();
  });
});
