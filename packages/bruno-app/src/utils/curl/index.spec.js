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

  it('should map postman form-data into a multipart body', () => {
    const curl = 'curl --location \'https://example.com/upload\' --form \'name="John"\' --form \'file=@"/path/to/file.txt"\'';

    const request = getRequestFromCurlCommand(curl);

    expect(request.body.mode).toBe('multipartForm');
    expect(request.body.multipartForm).toEqual([
      { uid: expect.any(String), name: 'name', value: 'John', type: 'text', enabled: true },
      { uid: expect.any(String), name: 'file', value: ['/path/to/file.txt'], type: 'file', enabled: true }
    ]);
  });
});
