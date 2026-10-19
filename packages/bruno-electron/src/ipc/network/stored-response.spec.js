const { ScriptRuntime } = require('@usebruno/js');
const { buildScriptResponse, applyRequestSent } = require('./stored-response');

const makeStoredResponse = () => ({
  state: 'success',
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json', 'x-trace': 'abc' },
  data: { output: [{ type: 'message', content: [{ text: 'Hello\nWorld' }] }] },
  dataBuffer: Buffer.from(JSON.stringify({ output: [] })).toString('base64'),
  size: 13,
  duration: 42,
  url: 'https://api.example.com:8443/v1/responses?stream=false',
  timeline: []
});

const makeRequest = (responseScript) => ({
  url: 'https://api.example.com/v1/responses?stream=false',
  method: 'POST',
  headers: {},
  script: { res: responseScript }
});

const runScript = (runtime, script, response, { envVariables = {}, runtimeVariables = {}, onConsoleLog = jest.fn() } = {}) => {
  const scriptRuntime = new ScriptRuntime({ runtime });
  return scriptRuntime.runResponseScript(
    script,
    makeRequest(script),
    response,
    envVariables,
    runtimeVariables,
    process.cwd(),
    onConsoleLog,
    {},
    { runtime },
    undefined,
    'collection'
  );
};

describe('buildScriptResponse', () => {
  test('maps the renderer copy onto the shape scripts read', () => {
    const stored = makeStoredResponse();

    const response = buildScriptResponse(stored);

    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
    expect(response.headers).toEqual(stored.headers);
    expect(response.data).toEqual(stored.data);
    expect(response.responseTime).toBe(42);
    expect(Buffer.isBuffer(response.dataBuffer)).toBe(true);
    expect(response.dataBuffer.toString()).toBe('{"output":[]}');
    expect(response.request).toEqual({ protocol: 'https:', host: 'api.example.com', path: '/v1/responses?stream=false' });
  });

  test('still builds the response when the stored url cannot be parsed', () => {
    const response = buildScriptResponse({ ...makeStoredResponse(), url: '{{host}}/relative' });

    expect(response.request).toBeUndefined();
    expect(response.status).toBe(200);
  });

  test('tolerates a stored response without url or body bytes', () => {
    const response = buildScriptResponse({ ...makeStoredResponse(), url: undefined, dataBuffer: undefined });

    expect(response.request).toBeUndefined();
    expect(response.dataBuffer.length).toBe(0);
  });
});

describe('applyRequestSent', () => {
  test('replaces the prepared request with what was sent', () => {
    const request = makeRequest('');

    applyRequestSent(request, { url: 'https://api.example.com/resolved', method: 'GET', headers: { a: 'b' }, data: 'x' });

    expect(request).toMatchObject({ url: 'https://api.example.com/resolved', method: 'GET', headers: { a: 'b' }, data: 'x' });
  });

  test('keeps the prepared request when nothing was recorded as sent', () => {
    const request = makeRequest('');

    applyRequestSent(request, undefined);

    expect(request.url).toBe('https://api.example.com/v1/responses?stream=false');
  });
});

describe.each(['quickjs', 'nodevm'])('post-response script against a stored response [%s]', (runtime) => {
  test('the script reads the stored response through the res API', async () => {
    const onConsoleLog = jest.fn();
    const script = `
      const body = res.getBody();
      console.log(body.output.filter((x) => x.type === 'message')[0].content[0].text);
      console.log(res.getStatus(), res.getHeader('x-trace'), res.getResponseTime(), res.getUrl());
    `;

    await runScript(runtime, script, buildScriptResponse(makeStoredResponse()), { onConsoleLog });

    expect(onConsoleLog).toHaveBeenNthCalledWith(1, 'log', ['Hello\nWorld']);
    expect(onConsoleLog).toHaveBeenNthCalledWith(2, 'log', [200, 'abc', 42, 'https://api.example.com/v1/responses?stream=false']);
  });

  test('running repeatedly with a script that mutates the body leaves the stored response untouched', async () => {
    const stored = makeStoredResponse();
    const snapshot = JSON.parse(JSON.stringify(stored));
    const script = `
      res.setBody({ mutated: true });
      bru.setVar('seen', JSON.stringify(res.getBody()));
    `;

    const first = {};
    const second = {};
    await runScript(runtime, script, buildScriptResponse(stored), { runtimeVariables: first });
    await runScript(runtime, script, buildScriptResponse(stored), { runtimeVariables: second });

    expect(first.seen).toBe('{"mutated":true}');
    expect(second.seen).toBe('{"mutated":true}');
    expect(stored).toEqual(snapshot);
  });

  test('an async script completes before the run resolves', async () => {
    const runtimeVariables = {};
    const script = `
      await new Promise((resolve) => setTimeout(resolve, 20));
      bru.setVar('finished', 'yes');
    `;

    await runScript(runtime, script, buildScriptResponse(makeStoredResponse()), { runtimeVariables });

    expect(runtimeVariables.finished).toBe('yes');
  });

  test('a throwing script rejects so the caller can report it, and a later run still succeeds', async () => {
    const response = buildScriptResponse(makeStoredResponse());

    await expect(runScript(runtime, 'throw new Error("boom");', response)).rejects.toThrow('boom');

    const runtimeVariables = {};
    await runScript(runtime, 'bru.setVar("ok", "1");', buildScriptResponse(makeStoredResponse()), { runtimeVariables });
    expect(runtimeVariables.ok).toBe('1');
  });
});
