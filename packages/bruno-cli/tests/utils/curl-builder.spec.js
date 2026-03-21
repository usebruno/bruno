const { describe, it, expect } = require('@jest/globals');
const { buildCurlCommand } = require('../../src/utils/curl-builder');

describe('buildCurlCommand', () => {
  describe('method and URL', () => {
    it('should generate a simple GET request', () => {
      const result = buildCurlCommand({ method: 'GET', url: 'https://example.com/api' });
      expect(result).toBe('curl \'https://example.com/api\'');
    });

    it('should omit -X for GET requests', () => {
      const result = buildCurlCommand({ method: 'GET', url: 'https://example.com' });
      expect(result).not.toContain('-X');
    });

    it('should include -X for non-GET methods', () => {
      const result = buildCurlCommand({ method: 'POST', url: 'https://example.com' });
      expect(result).toContain('-X POST');
    });

    it('should uppercase the method', () => {
      const result = buildCurlCommand({ method: 'post', url: 'https://example.com' });
      expect(result).toContain('-X POST');
    });

    it('should default to GET when method is not provided', () => {
      const result = buildCurlCommand({ url: 'https://example.com' });
      expect(result).not.toContain('-X');
    });

    it('should shell-quote the URL', () => {
      const result = buildCurlCommand({ method: 'GET', url: 'https://example.com/search?q=hello world' });
      expect(result).toContain('\'https://example.com/search?q=hello world\'');
    });
  });

  describe('headers', () => {
    it('should include headers with -H', () => {
      const result = buildCurlCommand({
        method: 'GET',
        url: 'https://example.com',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result).toContain('-H \'Content-Type: application/json\'');
    });

    it('should include multiple headers', () => {
      const result = buildCurlCommand({
        method: 'GET',
        url: 'https://example.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123'
        }
      });
      expect(result).toContain('-H \'Content-Type: application/json\'');
      expect(result).toContain('-H \'Authorization: Bearer token123\'');
    });

    it('should skip headers with null or undefined values', () => {
      const result = buildCurlCommand({
        method: 'GET',
        url: 'https://example.com',
        headers: { 'X-Null': null, 'X-Undef': undefined, 'X-Valid': 'yes' }
      });
      expect(result).not.toContain('X-Null');
      expect(result).not.toContain('X-Undef');
      expect(result).toContain('-H \'X-Valid: yes\'');
    });
  });

  describe('JSON body', () => {
    it('should include JSON object body with --data-raw', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com',
        mode: 'json',
        data: { key: 'value' }
      });
      expect(result).toContain(`--data-raw '{"key":"value"}'`);
    });

    it('should include JSON string body with --data-raw', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com',
        mode: 'json',
        data: '{"key":"value"}'
      });
      expect(result).toContain(`--data-raw '{"key":"value"}'`);
    });

    it('should not include body when data is null', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com',
        mode: 'json',
        data: null
      });
      expect(result).not.toContain('--data-raw');
    });

    it('should not include body when data is empty string', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com',
        mode: 'json',
        data: ''
      });
      expect(result).not.toContain('--data-raw');
    });
  });

  describe('text, xml, sparql body modes', () => {
    it('should handle text body', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com',
        mode: 'text',
        data: 'plain text body'
      });
      expect(result).toContain('--data-raw \'plain text body\'');
    });

    it('should handle xml body', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com',
        mode: 'xml',
        data: '<root><item>value</item></root>'
      });
      expect(result).toContain('--data-raw \'<root><item>value</item></root>\'');
    });

    it('should handle sparql body', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com',
        mode: 'sparql',
        data: 'SELECT ?s WHERE { ?s ?p ?o }'
      });
      expect(result).toContain('--data-raw \'SELECT ?s WHERE { ?s ?p ?o }\'');
    });
  });

  describe('form URL encoded body', () => {
    it('should use --data-urlencode for array params', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com',
        mode: 'formUrlEncoded',
        data: [
          { name: 'username', value: 'john' },
          { name: 'password', value: 's3cret' }
        ]
      });
      expect(result).toContain('--data-urlencode \'username=john\'');
      expect(result).toContain('--data-urlencode \'password=s3cret\'');
    });

    it('should use --data-raw for string form data', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com',
        mode: 'formUrlEncoded',
        data: 'username=john&password=s3cret'
      });
      expect(result).toContain('--data-raw \'username=john&password=s3cret\'');
    });

    it('should not include body for empty string form data', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com',
        mode: 'formUrlEncoded',
        data: ''
      });
      expect(result).not.toContain('--data-raw');
    });
  });

  describe('multipart form body', () => {
    it('should use -F for text fields', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com',
        mode: 'multipartForm',
        data: [{ name: 'field1', value: 'value1', type: 'text' }]
      });
      expect(result).toContain('-F \'field1=value1\'');
    });

    it('should use -F with @ for file fields using filePaths', () => {
      const result = buildCurlCommand(
        {
          method: 'POST',
          url: 'https://example.com',
          mode: 'multipartForm',
          data: [{ name: 'upload', value: '', type: 'file' }]
        },
        { filePaths: { multipart: [{ name: 'upload', path: '/home/user/photo.jpg' }] } }
      );
      expect(result).toContain('-F \'upload=@/home/user/photo.jpg\'');
    });

    it('should fall back to param.value for file fields without filePaths', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com',
        mode: 'multipartForm',
        data: [{ name: 'upload', value: 'photo.jpg', type: 'file' }]
      });
      expect(result).toContain('-F \'upload=@photo.jpg\'');
    });
  });

  describe('graphql body', () => {
    it('should serialize graphql query and variables', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com/graphql',
        mode: 'graphql',
        data: {
          query: '{ users { id name } }',
          variables: { limit: 10 }
        }
      });
      const body = JSON.parse(result.match(/--data-raw '(.+)'/)[1]);
      expect(body).toEqual({
        query: '{ users { id name } }',
        variables: { limit: 10 }
      });
    });

    it('should default variables to empty object', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com/graphql',
        mode: 'graphql',
        data: { query: '{ users { id } }' }
      });
      const body = JSON.parse(result.match(/--data-raw '(.+)'/)[1]);
      expect(body.variables).toEqual({});
    });
  });

  describe('file body', () => {
    it('should use --data-binary with @ for file body', () => {
      const result = buildCurlCommand(
        {
          method: 'POST',
          url: 'https://example.com/upload',
          mode: 'file',
          data: null
        },
        { filePaths: { body: '/home/user/data.bin' } }
      );
      expect(result).toContain('--data-binary \'@/home/user/data.bin\'');
    });

    it('should use "unknown" when no file path is provided', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com/upload',
        mode: 'file',
        data: null
      });
      expect(result).toContain('--data-binary \'@unknown\'');
    });
  });

  describe('authentication', () => {
    it('should include --digest and --user for digest auth', () => {
      const result = buildCurlCommand({
        method: 'GET',
        url: 'https://example.com',
        digestConfig: { username: 'admin', password: 'secret' }
      });
      expect(result).toContain('--digest');
      expect(result).toContain('--user \'admin:secret\'');
    });

    it('should include --ntlm and --user for NTLM auth', () => {
      const result = buildCurlCommand({
        method: 'GET',
        url: 'https://example.com',
        ntlmConfig: { username: 'admin', password: 'secret', domain: 'CORP' }
      });
      expect(result).toContain('--ntlm');
      expect(result).toContain('--user \'CORP\\admin:secret\'');
    });

    it('should handle NTLM auth without domain', () => {
      const result = buildCurlCommand({
        method: 'GET',
        url: 'https://example.com',
        ntlmConfig: { username: 'admin', password: 'secret' }
      });
      expect(result).toContain('--user \'admin:secret\'');
    });

    it('should add a comment for OAuth2', () => {
      const result = buildCurlCommand({
        method: 'GET',
        url: 'https://example.com',
        oauth2: { grantType: 'client_credentials' }
      });
      expect(result).toContain('# Note: OAuth2');
    });

    it('should add a comment for AWS SigV4', () => {
      const result = buildCurlCommand({
        method: 'GET',
        url: 'https://example.com',
        awsv4config: { region: 'us-east-1' }
      });
      expect(result).toContain('# Note: AWS SigV4');
    });
  });

  describe('shell quoting', () => {
    it('should escape single quotes in values', () => {
      const result = buildCurlCommand({
        method: 'POST',
        url: 'https://example.com',
        mode: 'json',
        data: 'it\'s a test'
      });
      expect(result).toContain('\'it\'\\\'\'s a test\'');
    });

    it('should handle special shell characters in URLs', () => {
      const result = buildCurlCommand({
        method: 'GET',
        url: 'https://example.com/api?a=1&b=2'
      });
      expect(result).toContain('\'https://example.com/api?a=1&b=2\'');
    });
  });

  describe('formatting', () => {
    it('should use single line for simple GET requests', () => {
      const result = buildCurlCommand({ method: 'GET', url: 'https://example.com' });
      expect(result).not.toContain('\\\n');
    });

    it('should use line continuations when there are multiple parts', () => {
      const result = buildCurlCommand({
        method: 'GET',
        url: 'https://example.com',
        headers: { Accept: 'application/json' }
      });
      expect(result).toContain(' \\\n  ');
    });
  });
});
