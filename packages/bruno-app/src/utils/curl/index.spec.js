import { getRequestFromCurlCommand } from './index';

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
  // params, so a `--form` cURL produced an empty Body tab. The handler now
  // dispatches setMultipartFormParams / setFormUrlEncodedParams, which fill in
  // uid and the per-mode defaults themselves; what is asserted here is the
  // shape the parser hands them.
  it('parses a --form text field into a multipartForm entry', () => {
    const curl = `curl --request GET --url https://echo.usebruno.com/ --header 'Content-Type: multipart/form-data' --form myBody=testValue`;

    const request = getRequestFromCurlCommand(curl);

    expect(request.body.mode).toBe('multipartForm');
    expect(request.body.multipartForm).toEqual([
      { name: 'myBody', value: 'testValue', type: 'text', enabled: true }
    ]);
  });

  it('wraps a file entry value in an array, which multipartFormSchema requires', () => {
    const request = getRequestFromCurlCommand(`curl --url https://e.com/ -F doc=@/tmp/a.pdf`);

    expect(request.body.multipartForm).toEqual([
      { name: 'doc', value: ['/tmp/a.pdf'], type: 'file', enabled: true }
    ]);
  });

  it('leaves a text entry value a string while wrapping the file beside it', () => {
    const request = getRequestFromCurlCommand(`curl --url https://e.com/ -F name=bruno -F doc=@/tmp/a.pdf`);

    expect(request.body.multipartForm.map((p) => [p.name, p.type, p.value])).toEqual([
      ['name', 'text', 'bruno'],
      ['doc', 'file', ['/tmp/a.pdf']]
    ]);
  });

  it('parses a url-encoded body into enabled params', () => {
    const request = getRequestFromCurlCommand(
      `curl --url https://e.com/ -H 'Content-Type: application/x-www-form-urlencoded' -d 'a=1&b=2'`
    );

    expect(request.body.mode).toBe('formUrlEncoded');
    expect(request.body.formUrlEncoded.map((p) => [p.name, p.value, p.enabled])).toEqual([
      ['a', '1', true],
      ['b', '2', true]
    ]);
  });
});
