const jsonToBru = require('../src/jsonToBru');

describe('Newline Stripping in jsonToBru', () => {
  describe('Query Parameters', () => {
    it('should strip newlines from query parameter values', () => {
      const input = {
        http: {
          method: 'GET',
          url: 'https://api.example.com'
        },
        params: [
          {
            name: 'search',
            value: 'hello\nworld',
            enabled: true,
            type: 'query'
          },
          {
            name: 'filter',
            value: 'value\r\nwith\nlines',
            enabled: true,
            type: 'query'
          }
        ]
      };

      const output = jsonToBru(input);
      
      expect(output).toContain('search: helloworld');
      expect(output).toContain('filter: valuewithlines');
      // Ensure the values don't contain the original newlines
      expect(output).not.toContain('hello\nworld');
      expect(output).not.toContain('value\r\nwith\nlines');
    });

    it('should strip newlines from query parameter keys with special characters', () => {
      const input = {
        http: {
          method: 'GET', 
          url: 'https://api.example.com'
        },
        params: [
          {
            name: 'param\nwith\nnewlines',
            value: 'value',
            enabled: true,
            type: 'query'
          },
          {
            name: 'param:with:colons\nand\nnewlines',
            value: 'another\nvalue',
            enabled: true,
            type: 'query'
          }
        ]
      };

      const output = jsonToBru(input);
      
      expect(output).toContain('paramwithnewlines: value');
      expect(output).toContain('"param:with:colonsandnewlines": anothervalue');
      // Ensure the keys and values don't contain the original newlines
      expect(output).not.toContain('param\nwith\nnewlines');
      expect(output).not.toContain('param:with:colons\nand\nnewlines');
      expect(output).not.toContain('another\nvalue');
    });

    it('should handle disabled query parameters with newlines', () => {
      const input = {
        http: {
          method: 'GET',
          url: 'https://api.example.com'
        },
        params: [
          {
            name: 'disabled\nparam',
            value: 'disabled\nvalue',
            enabled: false,
            type: 'query'
          }
        ]
      };

      const output = jsonToBru(input);
      
      expect(output).toContain('~disabledparam: disabledvalue');
      // Ensure the original newlines are stripped
      expect(output).not.toContain('disabled\nparam');
      expect(output).not.toContain('disabled\nvalue');
    });
  });

  describe('Path Parameters', () => {
    it('should strip newlines from path parameter values', () => {
      const input = {
        http: {
          method: 'GET',
          url: 'https://api.example.com'
        },
        params: [
          {
            name: 'userId',
            value: 'user\nwith\nnewlines',
            enabled: true,
            type: 'path'
          },
          {
            name: 'action',
            value: 'delete\r\nuser',
            enabled: true,
            type: 'path'
          }
        ]
      };

      const output = jsonToBru(input);
      
      expect(output).toContain('userId: userwithnewlines');
      expect(output).toContain('action: deleteuser');
      // Ensure the original newlines are stripped
      expect(output).not.toContain('user\nwith\nnewlines');
      expect(output).not.toContain('delete\r\nuser');
    });

    it('should strip newlines from path parameter names with special characters', () => {
      const input = {
        http: {
          method: 'GET',
          url: 'https://api.example.com'
        },
        params: [
          {
            name: 'param\nwith\nnewlines',
            value: 'value',
            enabled: true,
            type: 'path'
          },
          {
            name: 'param:with:colons\nand\nnewlines',
            value: 'another\nvalue',
            enabled: true,
            type: 'path'
          }
        ]
      };

      const output = jsonToBru(input);
      
      expect(output).toContain('paramwithnewlines: value');
      expect(output).toContain('"param:with:colonsandnewlines": anothervalue');
      // Ensure the keys and values don't contain the original newlines
      expect(output).not.toContain('param\nwith\nnewlines');
      expect(output).not.toContain('param:with:colons\nand\nnewlines');
      expect(output).not.toContain('another\nvalue');
    });
  });

  describe('Headers', () => {
    it('should strip newlines from header values', () => {
      const input = {
        http: {
          method: 'POST',
          url: 'https://api.example.com'
        },
        headers: [
          {
            name: 'Content-Type',
            value: 'application/json;\ncharset=utf-8',
            enabled: true
          },
          {
            name: 'Authorization',
            value: 'Bearer token\r\nwith\nnewlines',
            enabled: true
          }
        ]
      };

      const output = jsonToBru(input);
      
      expect(output).toContain('Content-Type: application/json;charset=utf-8');
      expect(output).toContain('Authorization: Bearer tokenwithnewlines');
      // Ensure the original newlines are stripped
      expect(output).not.toContain('application/json;\ncharset=utf-8');
      expect(output).not.toContain('Bearer token\r\nwith\nnewlines');
    });

    it('should strip newlines from header names with special characters', () => {
      const input = {
        http: {
          method: 'POST',
          url: 'https://api.example.com'
        },
        headers: [
          {
            name: 'X-Custom\nHeader',
            value: 'value',
            enabled: true
          },
          {
            name: 'Header:With:Colons\nAnd\nNewlines',
            value: 'complex\nvalue',
            enabled: true
          }
        ]
      };

      const output = jsonToBru(input);
      
      expect(output).toContain('X-CustomHeader: value');
      expect(output).toContain('"Header:With:ColonsAndNewlines": complexvalue');
      // Ensure the original newlines are stripped
      expect(output).not.toContain('X-Custom\nHeader');
      expect(output).not.toContain('Header:With:Colons\nAnd\nNewlines');
      expect(output).not.toContain('complex\nvalue');
    });

    it('should handle disabled headers with newlines', () => {
      const input = {
        http: {
          method: 'POST',
          url: 'https://api.example.com'
        },
        headers: [
          {
            name: 'Disabled\nHeader',
            value: 'disabled\nvalue',
            enabled: false
          }
        ]
      };

      const output = jsonToBru(input);
      
      expect(output).toContain('~DisabledHeader: disabledvalue');
      // Ensure the original newlines are stripped
      expect(output).not.toContain('Disabled\nHeader');
      expect(output).not.toContain('disabled\nvalue');
    });
  });

  describe('Metadata', () => {
    it('should strip newlines from metadata values', () => {
      const input = {
        http: {
          method: 'GET',
          url: 'https://api.example.com'
        },
        metadata: [
          {
            name: 'description',
            value: 'This is a\nmultiline\ndescription',
            enabled: true
          },
          {
            name: 'tags',
            value: 'tag1\ntag2\ntag3',
            enabled: true
          }
        ]
      };

      const output = jsonToBru(input);
      
      expect(output).toContain('description: This is amultilinedescription');
      expect(output).toContain('tags: tag1tag2tag3');
      // Ensure the original newlines are stripped
      expect(output).not.toContain('This is a\nmultiline\ndescription');
      expect(output).not.toContain('tag1\ntag2\ntag3');
    });

    it('should handle disabled metadata with newlines', () => {
      const input = {
        http: {
          method: 'GET',
          url: 'https://api.example.com'
        },
        metadata: [
          {
            name: 'disabled-meta',
            value: 'disabled\nmetadata\nvalue',
            enabled: false
          }
        ]
      };

      const output = jsonToBru(input);
      
      expect(output).toContain('~disabled-meta: disabledmetadatavalue');
      // Ensure the original newlines are stripped
      expect(output).not.toContain('disabled\nmetadata\nvalue');
    });
  });

  describe('URL Newline Stripping', () => {
    it('should strip newlines from URLs', () => {
      const input = {
        http: {
          method: 'GET',
          url: 'https://api.example.com/\npath/with\nnewlines'
        }
      };

      const output = jsonToBru(input);
      
      expect(output).toContain('url: https://api.example.com/path/withnewlines');
      // Ensure the original URL newlines are stripped
      expect(output).not.toContain('https://api.example.com/\npath/with\nnewlines');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty values with newlines', () => {
      const input = {
        http: {
          method: 'GET',
          url: 'https://api.example.com'
        },
        headers: [
          {
            name: 'Empty-Header',
            value: '\n\r\n',
            enabled: true
          }
        ]
      };

      const output = jsonToBru(input);
      
      expect(output).toContain('Empty-Header: ');
      // Original newlines should be stripped, leaving empty value
      expect(output).not.toMatch(/Empty-Header:\s*\n\r?\n/);
    });

    it('should handle mixed newline types', () => {
      const input = {
        http: {
          method: 'GET',
          url: 'https://api.example.com'
        },
        params: [
          {
            name: 'mixed',
            value: 'value\nwith\r\nmixed\rnewlines',
            enabled: true,
            type: 'query'
          }
        ]
      };

      const output = jsonToBru(input);
      
      expect(output).toContain('mixed: valuewithmixednewlines');
      // Ensure all types of newlines are stripped
      expect(output).not.toContain('value\nwith\r\nmixed\rnewlines');
    });

    it('should preserve other special characters while stripping newlines', () => {
      const input = {
        http: {
          method: 'GET',
          url: 'https://api.example.com'
        },
        headers: [
          {
            name: 'Complex-Header',
            value: 'value with\nspaces, {braces}, "quotes"\nand: colons',
            enabled: true
          }
        ]
      };

      const output = jsonToBru(input);
      
      expect(output).toContain('Complex-Header: value withspaces, {braces}, "quotes"and: colons');
      // Ensure newlines are stripped but other characters preserved
      expect(output).not.toContain('value with\nspaces, {braces}, "quotes"\nand: colons');
    });
  });
});