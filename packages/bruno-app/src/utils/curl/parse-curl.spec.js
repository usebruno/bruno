const { describe, it, expect } = require('@jest/globals');
import parseCurlCommand from './parse-curl';

describe('parseCurlCommand', () => {
  describe('basic functionality', () => {
    it('should handle basic GET request', () => {
      const result = parseCurlCommand('curl https://api.example.com/users');
      expect(result).toEqual({
        url: 'https://api.example.com/users',
        urlWithoutQuery: 'https://api.example.com/users',
        method: 'get'
      });
    });

    it('should parse explicit POST method', () => {
      const result = parseCurlCommand('curl -X POST https://api.example.com/users');
      expect(result).toEqual({
        url: 'https://api.example.com/users',
        urlWithoutQuery: 'https://api.example.com/users',
        method: 'post'
      });
    });
  });

  describe('headers handling', () => {
    it('should parse multiple headers', () => {
      const result = parseCurlCommand(
        `curl -H 'Content-Type: application/json' -H 'Authorization: Bearer token' https://api.example.com`
      );
      expect(result).toEqual({
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com',
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token'
        }
      });
    });

    it('should parse user-agent', () => {
      const result = parseCurlCommand(`curl -A 'Custom Agent' https://api.example.com`);
      expect(result).toEqual({
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com',
        method: 'get',
        headers: {
          'User-Agent': 'Custom Agent'
        }
      });
    });
  });

  describe('auth handling', () => {
    it('should parse basic auth', () => {
      const result = parseCurlCommand(`curl -u user:pass https://api.example.com`);
      expect(result).toEqual({
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com',
        method: 'get',
        auth: {
          mode: 'basic',
          basic: {
            username: 'user',
            password: 'pass'
          }
        }
      });
    });
  });

  describe('data handling', () => {
    it('should parse POST data', () => {
      const result = parseCurlCommand(`curl -d 'foo=bar&baz=qux' https://api.example.com`);
      expect(result).toEqual({
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com',
        method: 'post',
        data: 'foo=bar&baz=qux'
      });
    });

    it('should handle data-binary', () => {
      const result = parseCurlCommand(`curl --data-binary '@file.json' https://api.example.com`);
      expect(result).toEqual({
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com',
        method: 'post',
        data: '@file.json',
        isDataBinary: true
      });
    });
  });

  describe('form data handling', () => {
    it('should parse complex form data with multiple fields and file upload', () => {
      const curlCommand = `curl --location 'https://echo.usebruno.com/5cf47630-8d45-4fd3-937b-c4b1dea70c6d' \
        --form 'id="1"' \
        --form 'documentid="ADMINN_ID"' \
        --form 'appoinID="12376"' \
        --form 'autoclose="false"' \
        --form 'fileData=@"/path/to/file"'`;

      const result = parseCurlCommand(curlCommand);

      expect(result).toEqual({
        url: 'https://echo.usebruno.com/5cf47630-8d45-4fd3-937b-c4b1dea70c6d',
        urlWithoutQuery: 'https://echo.usebruno.com/5cf47630-8d45-4fd3-937b-c4b1dea70c6d',
        method: 'post',
        multipartUploads: [
          {
            name: 'id',
            value: '1',
            type: 'text',
            enabled: true
          },
          {
            name: 'documentid',
            value: 'ADMINN_ID',
            type: 'text',
            enabled: true
          },
          {
            name: 'appoinID',
            value: '12376',
            type: 'text',
            enabled: true
          },
          {
            name: 'autoclose',
            value: 'false',
            type: 'text',
            enabled: true
          },
          {
            name: 'fileData',
            value: '/path/to/file',
            type: 'file',
            enabled: true
          }
        ]
      });
    });
  });
});
