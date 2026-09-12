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

  it('should parse raw multipart form data from --data-raw', () => {
    const curl = `curl --url 'https://example.com/apply' \
      -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundaryTest' \
      --data-raw $'------WebKitFormBoundaryTest\\r\\nContent-Disposition: form-data; name="first_name"\\r\\n\\r\\nAda\\r\\n------WebKitFormBoundaryTest\\r\\nContent-Disposition: form-data; name="response"\\r\\n\\r\\n[{"answer":"yes"}]\\r\\n------WebKitFormBoundaryTest\\r\\nContent-Disposition: form-data; name=""\\r\\n\\r\\n30\\r\\n------WebKitFormBoundaryTest--\\r\\n'`;

    const request = getRequestFromCurlCommand(curl);

    expect(request.body.mode).toBe('multipartForm');
    expect(request.body.multipartForm).toEqual([
      { name: 'first_name', value: 'Ada', type: 'text', enabled: true },
      { name: 'response', value: '[{"answer":"yes"}]', type: 'text', enabled: true },
      { name: '', value: '30', type: 'text', enabled: true }
    ]);
  });
});
