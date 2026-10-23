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

describe('#9517 raw multipart MIME cURL regression', () => {
  const boundary = '----bruno9517Synthetic';
  const rawMime = `--${boundary}\r\nContent-Disposition: form-data; name="payload"; filename=""\r\nContent-Type: application/octet-stream\r\n\r\nsynthetic-only\r\n--${boundary}--\r\n`;
  const bashAnsi = (value) => `$'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n')}'`;
  const curlRaw = (flag, contentTypeHeader = 'Content-Type') =>
    `curl -X POST 'https://example.invalid/synthetic-upload' -H '${contentTypeHeader}: multipart/form-data; boundary=${boundary}' ${flag} ${bashAnsi(rawMime)}`;

  it('rejects Chrome Copy as cURL raw MIME payload with filename=""', () => {
    expect(getRequestFromCurlCommand(curlRaw('--data-raw'))).toBeNull();
  });

  it('rejects the same raw MIME payload from --data-binary', () => {
    expect(getRequestFromCurlCommand(curlRaw('--data-binary'))).toBeNull();
  });

  it('rejects raw MIME when Content-Type has lowercase casing', () => {
    expect(getRequestFromCurlCommand(curlRaw('--data-raw', 'content-type'))).toBeNull();
  });

  it('preserves structured multipart --form fields', () => {
    const request = getRequestFromCurlCommand("curl 'https://example.invalid/upload' --form 'first=hello' --form 'second=world'");
    expect(request?.body?.mode).toBe('multipartForm');
    expect(request.body.multipartForm).toHaveLength(2);
    expect(request.body.multipartForm.map(({name, value}) => ({name, value}))).toEqual([
      {name: 'first', value: 'hello'},
      {name: 'second', value: 'world'}
    ]);
  });

  it('preserves JSON and urlencoded data controls', () => {
    const json = getRequestFromCurlCommand(
      `curl 'https://example.invalid/json' -H 'Content-Type: application/json' --data-raw '{"value":"hello"}'`
    );
    expect(json?.body?.mode).toBe('json');
    expect(JSON.parse(json.body.json)).toEqual({value: 'hello'});
    const form = getRequestFromCurlCommand(
      "curl 'https://example.invalid/form' -H 'Content-Type: application/x-www-form-urlencoded' --data-raw 'a=1&b=2'"
    );
    expect(form?.body?.mode).toBe('formUrlEncoded');
    expect(form.body.formUrlEncoded).toHaveLength(2);
  });
});
