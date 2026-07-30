const { configureRequest } = require('../../src/ipc/network/index');

// Integration tests: full configureRequest (URL must survive cookie-jar parse)
describe('index: configureRequest — URL normalization', () => {
  it('prepends http:// to localhost:port', async () => {
    const request = { method: 'GET', url: 'localhost:8080', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('http://localhost:8080');
  });

  it('prepends http:// to localhost', async () => {
    const request = { method: 'GET', url: 'localhost', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('http://localhost');
  });

  it('prepends http:// to 127.0.0.1:port', async () => {
    const request = { method: 'GET', url: '127.0.0.1:3000', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('http://127.0.0.1:3000');
  });

  it('prepends http:// to example.com/api/v1', async () => {
    const request = { method: 'GET', url: 'example.com/api/v1', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('http://example.com/api/v1');
  });

  it('does not prepend http:// to http://example.com', async () => {
    const request = { method: 'GET', url: 'http://example.com', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('http://example.com');
  });

  it('does not prepend http:// to https://example.com', async () => {
    const request = { method: 'GET', url: 'https://example.com', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('https://example.com');
  });

  it('does not prepend http:// to ftp://test-domain', async () => {
    const request = { method: 'GET', url: 'ftp://test-domain', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('ftp://test-domain');
  });

  it('does not prepend http:// to ws://example.com/socket', async () => {
    const request = { method: 'GET', url: 'ws://example.com/socket', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('ws://example.com/socket');
  });

  describe('with variables in the url and no interpolation values', () => {
    it('does not prepend http:// to {{baseUrl}}/api/v1 (template variable)', async () => {
      const url = '{{baseUrl}}/api/v1';
      const request = { method: 'GET', url, body: {} };
      expect.assertions(2);
      try {
        await configureRequest(null, {}, request, null, null, null, null);
      } catch (err) {
        expect(err.message).toBe('Invalid URL');
      } finally {
        expect(request.url).toEqual(url);
      }
    });

    it('does not prepend http:// to {{baseUrl}} alone (template variable)', async () => {
      const url = '{{baseUrl}}';
      const request = { method: 'GET', url, body: {} };
      expect.assertions(2);
      try {
        await configureRequest(null, {}, request, null, null, null, null);
      } catch (err) {
        expect(err.message).toBe('Invalid URL');
      } finally {
        expect(request.url).toEqual(url);
      }
    });
  });
});

const { snapshotHeaderState, scriptSetHeaderNames } = require('../../src/ipc/network/index');
const interpolateVars = require('../../src/ipc/network/interpolate-vars');

/**
 * scriptSetHeaders is the attribution state the sent-headers views read to decide which headers the
 * pre-request script owns (script beats request beats folder beats collection beats transport
 * default). Misclassifying here shows a header under the wrong source on every surface that renders
 * it, so each way a script can touch a header is pinned below.
 */
describe('index: scriptSetHeaders attribution', () => {
  // The production sequence: snapshot the definition headers, let the script mutate them, diff.
  const attribute = (definitionHeaders, runScript = () => {}) => {
    const headers = { ...definitionHeaders };
    const snapshot = snapshotHeaderState(headers);
    runScript(headers);
    return { names: scriptSetHeaderNames(headers, snapshot), headers };
  };

  it('reports a header the script added', () => {
    const { names } = attribute({ 'request-header': 'rv' }, (headers) => {
      headers['x-script'] = 'sv';
    });

    expect(names).toEqual(['x-script']);
  });

  it('reports a definition header whose value the script overrode', () => {
    // The header is attributed to the script, not to the level that declared it, because the script's
    // value is the one that goes on the wire.
    const { names } = attribute({ 'request-header': 'rv', 'other': 'ov' }, (headers) => {
      headers['request-header'] = 'overridden-by-script';
    });

    expect(names).toEqual(['request-header']);
  });

  it('treats a case-differing override as the same header, not a new one', () => {
    // A script setting 'Content-Type' over a definition's 'content-type' is one header on the wire.
    const { names } = attribute({ 'content-type': 'application/json' }, (headers) => {
      delete headers['content-type'];
      headers['Content-Type'] = 'text/plain';
    });

    expect(names).toEqual(['Content-Type']);
  });

  it('reports nothing for a header the script deleted', () => {
    // A deleted header is not sent, so it must not be reported as script-set — the views would show a
    // row for a header that never went out.
    const { names } = attribute({ 'request-header': 'rv', 'doomed': 'dv' }, (headers) => {
      delete headers['doomed'];
    });

    expect(names).toEqual([]);
  });

  it('reports nothing when the script leaves the headers alone', () => {
    const { names } = attribute({ 'collection-header': 'cv', 'request-header': 'rv' });

    expect(names).toEqual([]);
  });

  it('reports a header the script set to the identical value it already had', () => {
    // Re-setting the same value is indistinguishable from never touching it, so it stays attributed
    // to the definition. Documented because it is a deliberate limit of a value-comparison diff.
    const { names } = attribute({ 'request-header': 'rv' }, (headers) => {
      headers['request-header'] = 'rv';
    });

    expect(names).toEqual([]);
  });

  it('does not attribute an interpolated definition value to the script', () => {
    // interpolateVars rewrites every header name and value in place, so a definition header holding a
    // {{var}} compares unequal to its snapshot afterwards. The diff has to run first — this pins that
    // ordering, since reversing it would misreport every templated header as script-set.
    const request = {
      method: 'GET',
      url: 'http://localhost:8081/p',
      headers: { 'x-token': '{{token}}', 'x-plain': 'static' }
    };
    const snapshot = snapshotHeaderState(request.headers);

    const namesBeforeInterpolation = scriptSetHeaderNames(request.headers, snapshot);
    interpolateVars(request, { token: 'resolved-secret' }, {}, {});

    expect(request.headers['x-token']).toBe('resolved-secret');
    expect(namesBeforeInterpolation).toEqual([]);
    // Proof the ordering is what protects it: diffing after interpolation misclassifies the header.
    expect(scriptSetHeaderNames(request.headers, snapshot)).toEqual(['x-token']);
  });

  it('handles a request that has no headers at all', () => {
    expect(scriptSetHeaderNames(undefined, snapshotHeaderState(undefined))).toEqual([]);

    const { names } = attribute(undefined, (headers) => {
      headers['x-script'] = 'sv';
    });
    expect(names).toEqual(['x-script']);
  });
});

/**
 * Both the single-request path and the collection/folder runner send this payload, and the renderer
 * reads scriptSetHeaders off it to group a request's headers by source. The two used to build it
 * separately, which is how the runner shipped without the field.
 */
describe('index: buildRequestSentPayload', () => {
  const { buildRequestSentPayload } = require('../../src/ipc/network/index');

  it('carries the script attribution through to the renderer', () => {
    const payload = buildRequestSentPayload({
      url: 'http://localhost:8081/p',
      method: 'GET',
      headers: { 'request-header': 'rv', 'x-script': 'sv' },
      scriptSetHeaders: ['x-script']
    });

    expect(payload.scriptSetHeaders).toEqual(['x-script']);
    expect(payload.headers).toEqual({ 'request-header': 'rv', 'x-script': 'sv' });
  });

  it('defaults the attribution to an empty list when no script ran', () => {
    // The renderer treats every name in this list as script-owned, so an absent value must become []
    // rather than undefined.
    const payload = buildRequestSentPayload({ url: 'http://localhost:8081/p', method: 'GET', headers: {} });

    expect(payload.scriptSetHeaders).toEqual([]);
  });

  it('drops the false Content-Type flag from the reported headers', () => {
    const payload = buildRequestSentPayload({
      url: 'http://localhost:8081/p',
      method: 'POST',
      headers: { 'Content-Type': false, 'x-keep': 'kv' }
    });

    // false is the marker that suppresses axios' auto Content-Type; no such header was sent.
    expect(payload.headers).toEqual({ 'x-keep': 'kv' });
  });

  it('does not mutate the request it reports on', () => {
    const request = {
      url: 'http://localhost:8081/p',
      method: 'POST',
      headers: { 'content-type': false },
      scriptSetHeaders: ['x-script']
    };

    const payload = buildRequestSentPayload(request);
    payload.headers['injected'] = 'iv';

    expect(request.headers).toEqual({ 'content-type': false });
  });
});
