const { describe, it, expect } = require('@jest/globals');
import parseCurlCommand from './parse-curl';

describe('parseCurlCommand', () => {
  describe('Basic HTTP Methods', () => {
    it('should parse simple GET request', () => {
      const result = parseCurlCommand(`
        curl https://api.example.com/users
      `);

      expect(result).toEqual({
        method: 'get',
        url: 'https://api.example.com/users',
        urlWithoutQuery: 'https://api.example.com/users'
      });
    });

    it('should parse explicit POST method', () => {
      const result = parseCurlCommand(`
        curl -X POST https://api.example.com/users
      `);

      expect(result).toEqual({
        method: 'post',
        url: 'https://api.example.com/users',
        urlWithoutQuery: 'https://api.example.com/users'
      });
    });

    it('should parse PUT method', () => {
      const result = parseCurlCommand(`
        curl -X PUT https://api.example.com/users/1
      `);

      expect(result).toEqual({
        method: 'put',
        url: 'https://api.example.com/users/1',
        urlWithoutQuery: 'https://api.example.com/users/1'
      });
    });

    it('should parse DELETE method', () => {
      const result = parseCurlCommand(`
        curl -X DELETE https://api.example.com/users/1
      `);

      expect(result).toEqual({
        method: 'delete',
        url: 'https://api.example.com/users/1',
        urlWithoutQuery: 'https://api.example.com/users/1'
      });
    });

    it('should parse HEAD method', () => {
      const result = parseCurlCommand(`
        curl -I https://api.example.com/users
      `);

      expect(result).toEqual({
        method: 'head',
        url: 'https://api.example.com/users',
        urlWithoutQuery: 'https://api.example.com/users'
      });
    });
  });

  describe('Headers', () => {
    it('should parse single header', () => {
      const result = parseCurlCommand(`
        curl --header "Content-Type: application/json" https://api.example.com
      `);

      expect(result).toEqual({
        method: 'get',
        headers: {
          'Content-Type': 'application/json'
        },
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });

    it('should parse single header (no space in header value)', () => {
      const result = parseCurlCommand(`
        curl --header "Content-Type:application/json" https://api.example.com
      `);

      expect(result).toEqual({
        method: 'get',
        headers: {
          'Content-Type': 'application/json'
        },
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });

    it('should parse multiple headers', () => {
      const result = parseCurlCommand(`
        curl -H "Content-Type: application/json" \
             -H "Authorization: Bearer token" \
             https://api.example.com
      `);

      expect(result).toEqual({
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });

    it('should parse user-agent header', () => {
      const result = parseCurlCommand(`
        curl -A "Custom User Agent" https://api.example.com
      `);

      expect(result).toEqual({
        method: 'get',
        headers: {
          'User-Agent': 'Custom User Agent'
        },
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });
  });

  describe('Data and Request Body', () => {
    it('should parse JSON data and change method to POST', () => {
      const result = parseCurlCommand(`
        curl -d '{"name": "John", "age": 30}' https://api.example.com/users
      `);

      expect(result).toEqual({
        method: 'post',
        data: '{"name": "John", "age": 30}',
        url: 'https://api.example.com/users',
        urlWithoutQuery: 'https://api.example.com/users'
      });
    });

    it('should parse post data', () => {
      const result = parseCurlCommand(`
        curl --data "name=John&age=30" https://api.example.com/users
      `);

      expect(result).toEqual({
        method: 'post',
        data: 'name=John&age=30',
        url: 'https://api.example.com/users',
        urlWithoutQuery: 'https://api.example.com/users'
      });
    });

    it('should handle multiple data flags', () => {
      const result = parseCurlCommand(`
        curl -d "name=John" \
             -d "age=30" \
             https://api.example.com/users
      `);

      expect(result).toEqual({
        method: 'post',
        data: 'name=John&age=30',
        url: 'https://api.example.com/users',
        urlWithoutQuery: 'https://api.example.com/users'
      });
    });

    it('should keep multiline data', () => {
      const result = parseCurlCommand(`
        curl -d '{"key": "some long message with line breaks


             multiline"}' \
             https://api.example.com/users
      `);

      expect(result).toEqual({
        method: 'post',
        data: `{"key": "some long message with line breaks


             multiline"}`,
        url: 'https://api.example.com/users',
        urlWithoutQuery: 'https://api.example.com/users'
      });
    });

    it('should keep multi space data', () => {
      const result = parseCurlCommand(`
        curl -d '{"key": "some long    spaced     message"}' \
             https://api.example.com/users
      `);

      expect(result).toEqual({
        method: 'post',
        data: '{"key": "some long    spaced     message"}',
        url: 'https://api.example.com/users',
        urlWithoutQuery: 'https://api.example.com/users'
      });
    });

    it('should parse binary data flag', () => {
      const result = parseCurlCommand(`
        curl --data-binary "@/path/to/file" https://api.example.com/upload
      `);

      expect(result).toEqual({
        method: 'post',
        data: '@/path/to/file',
        isDataBinary: true,
        url: 'https://api.example.com/upload',
        urlWithoutQuery: 'https://api.example.com/upload'
      });
    });

    it('should parse raw data flag', () => {
      const result = parseCurlCommand(`
        curl --data-raw '{"raw": "data"}' https://api.example.com
      `);

      expect(result).toEqual({
        method: 'post',
        data: '{"raw": "data"}',
        isDataRaw: true,
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });
  });

  describe('Authentication', () => {
    it('should parse basic authentication', () => {
      const result = parseCurlCommand(`
        curl -u "username:password" https://api.example.com
      `);

      expect(result).toEqual({
        method: 'get',
        auth: {
          mode: 'basic',
          basic: {
            username: 'username',
            password: 'password'
          }
        },
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });

    it('should handle username without password', () => {
      const result = parseCurlCommand(`
        curl --user "username" https://api.example.com
      `);

      expect(result).toEqual({
        method: 'get',
        auth: {
          mode: 'basic',
          basic: {
            username: 'username',
            password: ''
          }
        },
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });

    it('should parse digest authentication', () => {
      const result = parseCurlCommand(`
        curl --digest -u "myuser:mypass" https://api.example.com/digest
      `);

      expect(result).toEqual({
        method: 'get',
        auth: {
          mode: 'digest',
          digest: {
            username: 'myuser',
            password: 'mypass'
          }
        },
        url: 'https://api.example.com/digest',
        urlWithoutQuery: 'https://api.example.com/digest'
      });
    });

    it('should parse digest authentication with --user flag', () => {
      const result = parseCurlCommand(`
        curl --digest --user "admin:secret" https://api.example.com/secure
      `);

      expect(result).toEqual({
        method: 'get',
        auth: {
          mode: 'digest',
          digest: {
            username: 'admin',
            password: 'secret'
          }
        },
        url: 'https://api.example.com/secure',
        urlWithoutQuery: 'https://api.example.com/secure'
      });
    });

    it('should parse NTLM authentication', () => {
      const result = parseCurlCommand(`
        curl --ntlm -u "myuser:mypass" https://api.example.com/ntlm
      `);

      expect(result).toEqual({
        method: 'get',
        auth: {
          mode: 'ntlm',
          ntlm: {
            username: 'myuser',
            password: 'mypass'
          }
        },
        url: 'https://api.example.com/ntlm',
        urlWithoutQuery: 'https://api.example.com/ntlm'
      });
    });

    it('should parse NTLM authentication with --user flag', () => {
      const result = parseCurlCommand(`
        curl --ntlm --user "domain\\username:password" https://api.example.com/ntlm
      `);

      expect(result).toEqual({
        method: 'get',
        auth: {
          mode: 'ntlm',
          ntlm: {
            username: 'domain\\username',
            password: 'password'
          }
        },
        url: 'https://api.example.com/ntlm',
        urlWithoutQuery: 'https://api.example.com/ntlm'
      });
    });

    it('should handle digest auth flag before -u flag', () => {
      const result = parseCurlCommand(`
        curl -u "user:pass" --digest https://api.example.com
      `);

      expect(result).toEqual({
        method: 'get',
        auth: {
          mode: 'digest',
          digest: {
            username: 'user',
            password: 'pass'
          }
        },
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });
  });

  describe('Form Data', () => {
    it('should parse form data with text fields', () => {
      const result = parseCurlCommand(`
        curl -F "name=John" \
             -F "age=30" \
             https://api.example.com/users
      `);

      expect(result).toEqual({
        method: 'post',
        multipartUploads: [
          { name: 'name', value: 'John', type: 'text', enabled: true },
          { name: 'age', value: '30', type: 'text', enabled: true }
        ],
        url: 'https://api.example.com/users',
        urlWithoutQuery: 'https://api.example.com/users'
      });
    });

    it('should parse form data with file uploads', () => {
      const result = parseCurlCommand(`
        curl --form "file=@/path/to/file.txt" https://api.example.com/upload
      `);

      expect(result).toEqual({
        method: 'post',
        multipartUploads: [
          { name: 'file', value: '/path/to/file.txt', type: 'file', enabled: true }
        ],
        url: 'https://api.example.com/upload',
        urlWithoutQuery: 'https://api.example.com/upload'
      });
    });
  });

  describe('Cookie', () => {
    it('should handle cookie flag', () => {
      const result = parseCurlCommand(`
        curl -b "session=abc123" https://api.example.com
      `);

      expect(result).toEqual({
        method: 'get',
        headers: {
          Cookie: 'session=abc123'
        },
        cookieString: 'session=abc123',
        cookies: {
          session: 'abc123'
        },
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });

    it('should handle cookie flag with multiple cookies', () => {
      const result = parseCurlCommand(`
        curl -b "session=abc123; user=john" https://api.example.com
      `);

      expect(result).toEqual({
        method: 'get',
        headers: {
          Cookie: 'session=abc123; user=john'
        },
        cookieString: 'session=abc123; user=john',
        cookies: {
          session: 'abc123',
          user: 'john'
        },
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });

    it('should handle multiple cookie flags', () => {
      const result = parseCurlCommand(`
        curl -b "session=abc123" -b "user=john" https://api.example.com
      `);

      expect(result).toEqual({
        method: 'get',
        headers: {
          Cookie: 'session=abc123; user=john'
        },
        cookieString: 'session=abc123; user=john',
        cookies: {
          session: 'abc123',
          user: 'john'
        },
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });

    it('should handle complex cookie string', () => {
      const result = parseCurlCommand(`
        curl -b "session=abc123; user=john; path=/; domain=example.com; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; HttpOnly" \
             https://api.example.com
      `);

      expect(result).toEqual({
        method: 'get',
        headers: {
          Cookie: 'session=abc123; user=john; path=/; domain=example.com; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; HttpOnly'
        },
        cookieString: 'session=abc123; user=john; path=/; domain=example.com; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; HttpOnly',
        cookies: {
          session: 'abc123',
          user: 'john',
          path: '/',
          domain: 'example.com',
          expires: 'Thu, 01 Jan 1970 00:00:00 GMT'
        },
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });
  });

  describe('Shell Quote Handling', () => {
    it(`should handle shell quote patterns ('\'' => \')`, () => {
      const result = parseCurlCommand(`
        curl -d '{"name": "John\'\\'\'s data"}' https://api.example.com
      `);

      expect(result).toEqual({
        method: 'post',
        data: '{"name": "John\'s data"}',
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });

    it('should handle complex escaped quotes', () => {
      const result = parseCurlCommand(`
        curl -d '{"message": "Don\\'t stop believing"}' https://api.example.com
      `);

      expect(result).toEqual({
        method: 'post',
        data: '{"message": "Don\'t stop believing"}',
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });
  });

  describe('URL Handling', () => {
    it('should parse URLs with query parameters', () => {
      const result = parseCurlCommand(`
        curl https://api.example.com/users?page=1&limit=10&sort=asc
      `);

      expect(result).toEqual({
        method: 'get',
        queries: [
          { name: 'page', value: '1' },
          { name: 'limit', value: '10' },
          { name: 'sort', value: 'asc' }
        ],
        url: 'https://api.example.com/users?page=1&limit=10&sort=asc',
        urlWithoutQuery: 'https://api.example.com/users'
      });
    });

    it('should handle URLs with paths', () => {
      const result = parseCurlCommand(`
        curl https://api.example.com/v1/users/123
      `);

      expect(result).toEqual({
        method: 'get',
        url: 'https://api.example.com/v1/users/123',
        urlWithoutQuery: 'https://api.example.com/v1/users/123'
      });
    });
  });

  describe('handling URLs without protocols', () => {
    it('should parse URL without protocol and default to https', () => {
      const result = parseCurlCommand(`
        curl echo.usebruno.com
      `);

      expect(result).toEqual({
        method: 'get',
        url: 'https://echo.usebruno.com',
        urlWithoutQuery: 'https://echo.usebruno.com'
      });
    });

    it('should parse URL without protocol with path and query parameters', () => {
      const result = parseCurlCommand(`
        curl api.example.com/users?page=1&limit=10
      `);

      expect(result).toEqual({
        method: 'get',
        url: 'https://api.example.com/users?page=1&limit=10',
        urlWithoutQuery: 'https://api.example.com/users',
        queries: [
          { name: 'page', value: '1' },
          { name: 'limit', value: '10' }
        ]
      });
    });

    it('should parse a complex curl command with multiple features and no protocol', () => {
      const result = parseCurlCommand(`
        curl -X POST \
             -H "Content-Type: application/json" \
             -H "Authorization: Bearer token123" \
             -H "X-Custom-Header: custom header" \
             -d '{"name": "John\\'s data", "email": "john@example.com", "message": "Don\\'t stop believing!", "path": "/home/user/file.txt", "json": {"nested": "value", "array": [1, 2, 3]}}' \
             -u "api_user:api_pass" \
             --compressed \
             api.example.com/v1/users?param1=value1&param2=custom+param
      `);

      expect(result).toEqual({
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom header',
          'Accept-Encoding': 'deflate, gzip'
        },
        data: '{"name": "John\'s data", "email": "john@example.com", "message": "Don\'t stop believing!", "path": "/home/user/file.txt", "json": {"nested": "value", "array": [1, 2, 3]}}',
        auth: {
          mode: 'basic',
          basic: {
            username: 'api_user',
            password: 'api_pass'
          }
        },
        queries: [
          { name: 'param1', value: 'value1' },
          { name: 'param2', value: 'custom+param' }
        ],
        url: 'https://api.example.com/v1/users?param1=value1&param2=custom+param',
        urlWithoutQuery: 'https://api.example.com/v1/users'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle compressed flag', () => {
      const result = parseCurlCommand(`
        curl --compressed https://api.example.com
      `);

      expect(result).toEqual({
        method: 'get',
        headers: {
          'Accept-Encoding': 'deflate, gzip'
        },
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });

    it('should handle concatenated HTTP methods', () => {
      const result = parseCurlCommand(`
        curl -XPOST https://api.example.com/users
      `);

      expect(result).toEqual({
        method: 'post',
        url: 'https://api.example.com/users',
        urlWithoutQuery: 'https://api.example.com/users'
      });
    });

    it('should handle newlines and continuations', () => {
      const result = parseCurlCommand(`
        curl -H "Content-Type: application/json" \
             -d '{"name": "John"}' \
             https://api.example.com/users
      `);

      expect(result).toEqual({
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        data: '{"name": "John"}',
        url: 'https://api.example.com/users',
        urlWithoutQuery: 'https://api.example.com/users'
      });
    });
  });

  describe('Complex Examples', () => {
    it('should parse a complex curl command with multiple features', () => {
      const result = parseCurlCommand(`
        curl -X POST \
             -H "Content-Type: application/json" \
             -H "Authorization: Bearer token123" \
             -H "X-Custom-Header: custom header" \
             -d '{"name": "John\\'s data", "email": "john@example.com", "message": "Don\\'t stop believing!", "path": "/home/user/file.txt", "json": {"nested": "value", "array": [1, 2, 3]}}' \
             -u "api_user:api_pass" \
             --compressed \
             https://api.example.com/v1/users?param1=value1&param2=custom+param
      `);

      expect(result).toEqual({
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom header',
          'Accept-Encoding': 'deflate, gzip'
        },
        data: '{"name": "John\'s data", "email": "john@example.com", "message": "Don\'t stop believing!", "path": "/home/user/file.txt", "json": {"nested": "value", "array": [1, 2, 3]}}',
        auth: {
          mode: 'basic',
          basic: {
            username: 'api_user',
            password: 'api_pass'
          }
        },
        queries: [
          { name: 'param1', value: 'value1' },
          { name: 'param2', value: 'custom+param' }
        ],
        url: 'https://api.example.com/v1/users?param1=value1&param2=custom+param',
        urlWithoutQuery: 'https://api.example.com/v1/users'
      });
    });
  });

  describe('curl command with complex escape characters', () => {
    it('should parse a curl command with complex escape characters', () => {
      const result = parseCurlCommand(`
        curl -X POST \
             -H "Content-Type: application/json" \
             -H "Authorization: Bearer token123" \
             -d '{"name": "John\\'s data", "email": "john@example.com"}' \
             -u "api_user:api_pass" \
             --compressed \
             https://api.example.com/v1/users
      `);

      expect(result).toEqual({
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123',
          'Accept-Encoding': 'deflate, gzip'
        },
        data: '{"name": "John\'s data", "email": "john@example.com"}',
        auth: {
          mode: 'basic',
          basic: {
            username: 'api_user',
            password: 'api_pass'
          }
        },
        url: 'https://api.example.com/v1/users',
        urlWithoutQuery: 'https://api.example.com/v1/users'
      });
    });
  });

  describe('JSON Flag', () => {
    it('should handle basic JSON request', () => {
      const result = parseCurlCommand(`
        curl --json '{"name": "John Doe", "email": "john@example.com"}' \
             https://api.example.com/users
      `);

      expect(result).toEqual({
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        data: '{"name": "John Doe", "email": "john@example.com"}',
        url: 'https://api.example.com/users',
        urlWithoutQuery: 'https://api.example.com/users'
      });
    });

    it('should handle JSON with authentication headers', () => {
      const result = parseCurlCommand(`
        curl --json '{"title": "New Post", "content": "Post content"}' \
             -H "Authorization: Bearer token123" \
             https://api.example.com/posts
      `);

      expect(result).toEqual({
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123'
        },
        data: '{"title": "New Post", "content": "Post content"}',
        url: 'https://api.example.com/posts',
        urlWithoutQuery: 'https://api.example.com/posts'
      });
    });

    it('should handle complex JSON data', () => {
      const result = parseCurlCommand(`
        curl --json '{"user": {"name": "Jane", "email": "jane@example.com"}, "metadata": {"source": "web"}}' \
             https://api.example.com/users
      `);

      expect(result).toEqual({
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        data: '{"user": {"name": "Jane", "email": "jane@example.com"}, "metadata": {"source": "web"}}',
        url: 'https://api.example.com/users',
        urlWithoutQuery: 'https://api.example.com/users'
      });
    });

    it('should handle JSON with escaped quotes', () => {
      const result = parseCurlCommand(`
        curl --json '{"message": "Don\\'t stop believing!", "user": "John\\'s account"}' \
             https://api.example.com/messages
      `);

      expect(result).toEqual({
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        data: '{"message": "Don\'t stop believing!", "user": "John\'s account"}',
        url: 'https://api.example.com/messages',
        urlWithoutQuery: 'https://api.example.com/messages'
      });
    });

    it('should handle JSON with arrays and nested objects', () => {
      const result = parseCurlCommand(`
        curl --json '{"items": [{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}], "total": 2}' \
             https://api.example.com/orders
      `);

      expect(result).toEqual({
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        data: '{"items": [{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}], "total": 2}',
        url: 'https://api.example.com/orders',
        urlWithoutQuery: 'https://api.example.com/orders'
      });
    });

    it('should handle JSON with custom method', () => {
      const result = parseCurlCommand(`
        curl -X PUT \
             --json '{"status": "completed", "updated_at": "2024-01-15T10:30:00Z"}' \
             https://api.example.com/tasks/123
      `);

      expect(result).toEqual({
        method: 'put',
        headers: {
          'Content-Type': 'application/json'
        },
        data: '{"status": "completed", "updated_at": "2024-01-15T10:30:00Z"}',
        url: 'https://api.example.com/tasks/123',
        urlWithoutQuery: 'https://api.example.com/tasks/123'
      });
    });
  });

  describe('Insecure Flag', () => {
    it('should handle -k flag', () => {
      const result = parseCurlCommand(`
        curl -k https://api.example.com
      `);

      expect(result).toEqual({
        method: 'get',
        insecure: true,
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });

    it('should handle --insecure flag', () => {
      const result = parseCurlCommand(`
        curl --insecure https://api.example.com
      `);

      expect(result).toEqual({
        method: 'get',
        insecure: true,
        url: 'https://api.example.com',
        urlWithoutQuery: 'https://api.example.com'
      });
    });
  });

  describe('Query Flag', () => {
    it('should handle -G flag to convert POST data to GET query parameters', () => {
      const result = parseCurlCommand(`
        curl -G -d "name=John" -d "age=30" https://api.example.com/users
      `);

      expect(result).toEqual({
        method: 'get',
        url: 'https://api.example.com/users?name=John&age=30',
        urlWithoutQuery: 'https://api.example.com/users',
        queries: [
          { name: 'name', value: 'John' },
          { name: 'age', value: '30' }
        ]
      });
    });

    it('should handle -G flag with --data-urlencode', () => {
      const result = parseCurlCommand(`
        curl -G --data-urlencode "name=John Doe" \
             --data-urlencode "email=john@example.com" \
             --data-urlencode "hello" \
             https://api.example.com/users?test=urlquery&hello
      `);

      expect(result).toEqual({
        method: 'get',
        url: 'https://api.example.com/users?test=urlquery&name=John%20Doe&email=john@example.com&hello',
        urlWithoutQuery: 'https://api.example.com/users',
        queries: [
          { name: 'test', value: 'urlquery' },
          { name: 'name', value: 'John%20Doe' },
          { name: 'email', value: 'john@example.com' },
          { name: 'hello', value: '' }
        ]
      });
    });

    it('should handle -G flag with complex data', () => {
      const result = parseCurlCommand(`
        curl -G -d "search=test+query" \
             -d "filter=active" \
             -d "sort=name" \
             -d "page=1" \
             https://api.example.com/search
      `);

      expect(result).toEqual({
        method: 'get',
        url: 'https://api.example.com/search?search=test+query&filter=active&sort=name&page=1',
        urlWithoutQuery: 'https://api.example.com/search',
        queries: [
          { name: 'search', value: 'test+query' },
          { name: 'filter', value: 'active' },
          { name: 'sort', value: 'name' },
          { name: 'page', value: '1' }
        ]
      });
    });
  });
});
