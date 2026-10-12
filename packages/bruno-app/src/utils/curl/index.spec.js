import {
  getRequestFromCurlCommand,
  normalizeCurlFormUrlEncoded,
  normalizeCurlMultipartForm
} from './index';

describe('getRequestFromCurlCommand', () => {
  it('should treat --data-binary with inline JSON as a JSON body (not a file body)', () => {
    const curl = `curl -H "Content-Type: application/json; charset=UTF-8" --data-binary "{\\"pageUri\\":\\"/mobile-phones-store\\"}" "https://1.rome.api.flipkart.net/4/page/fetch"`;

    const request = getRequestFromCurlCommand(curl);

    expect(request.body.mode).toBe('json');
    expect(request.body.file).toBeNull();
    expect(JSON.parse(request.body.json)).toEqual({ pageUri: '/mobile-phones-store' });
  });

  it('should treat --data-binary with an @file reference as a file body', () => {
    const curl = `curl -H "Content-Type: application/octet-stream" --data-binary "@/path/to/payload.json" "https://example.com/upload"`;

    const request = getRequestFromCurlCommand(curl);

    expect(request.body.mode).toBe('file');
    expect(Array.isArray(request.body.file)).toBe(true);
    expect(request.body.file[0].filePath).toBe('/path/to/payload.json');
  });
});

describe('form bodies imported from a cURL command', () => {
  // #9511: the URL-bar paste handler set the body mode but never dispatched the
  // params, so a `--form` cURL produced an empty Body tab. These lock the shape
  // the handler now hands to `updateRequestBody`.
  it('parses a --form text field into a multipartForm entry', () => {
    const curl = `curl --request GET --url https://echo.usebruno.com/ --header 'Content-Type: multipart/form-data' --form myBody=testValue`;

    const request = getRequestFromCurlCommand(curl);

    expect(request.body.mode).toBe('multipartForm');
    expect(request.body.multipartForm).toEqual([
      { name: 'myBody', value: 'testValue', type: 'text', enabled: true }
    ]);
  });

  it('gives every multipart entry a uid, as the UI actions do', () => {
    const params = normalizeCurlMultipartForm([
      { name: 'a', value: '1', type: 'text', enabled: true }
    ]);

    expect(params).toHaveLength(1);
    expect(typeof params[0].uid).toBe('string');
    expect(params[0].uid.length).toBeGreaterThan(0);
    expect(params[0]).toMatchObject({ name: 'a', value: '1', type: 'text', enabled: true });
  });

  it('wraps a file entry value in an array, which multipartFormSchema requires', () => {
    const params = normalizeCurlMultipartForm([
      { name: 'doc', value: '/tmp/a.pdf', type: 'file', enabled: true }
    ]);

    expect(params[0].value).toEqual(['/tmp/a.pdf']);
  });

  it('leaves an already-array file value alone', () => {
    const params = normalizeCurlMultipartForm([
      { name: 'doc', value: ['/tmp/a.pdf', '/tmp/b.pdf'], type: 'file', enabled: true }
    ]);

    expect(params[0].value).toEqual(['/tmp/a.pdf', '/tmp/b.pdf']);
  });

  it('does not wrap a text entry value', () => {
    const params = normalizeCurlMultipartForm([
      { name: 'a', value: '1', type: 'text', enabled: true }
    ]);

    expect(params[0].value).toBe('1');
  });

  it('normalizes a mixed text and file form in one pass', () => {
    const request = getRequestFromCurlCommand(`curl --url https://e.com/ -F name=bruno -F doc=@/tmp/a.pdf`);

    const params = normalizeCurlMultipartForm(request.body.multipartForm);

    expect(params.map((p) => [p.name, p.type, p.value])).toEqual([
      ['name', 'text', 'bruno'],
      ['doc', 'file', ['/tmp/a.pdf']]
    ]);
  });

  it('gives url-encoded params a uid and changes nothing else', () => {
    const request = getRequestFromCurlCommand(
      `curl --url https://e.com/ -H 'Content-Type: application/x-www-form-urlencoded' -d 'a=1&b=2'`
    );

    expect(request.body.mode).toBe('formUrlEncoded');
    const params = normalizeCurlFormUrlEncoded(request.body.formUrlEncoded);

    expect(params.map((p) => [p.name, p.value, p.enabled])).toEqual([
      ['a', '1', true],
      ['b', '2', true]
    ]);
    expect(params.every((p) => typeof p.uid === 'string' && p.uid.length > 0)).toBe(true);
  });

  it('returns an empty array for a missing body, not undefined', () => {
    expect(normalizeCurlMultipartForm(undefined)).toEqual([]);
    expect(normalizeCurlFormUrlEncoded(null)).toEqual([]);
  });
});
