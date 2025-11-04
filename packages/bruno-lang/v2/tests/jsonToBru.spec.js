const stringify = require('../src/jsonToBru');
const parse = require('../src/bruToJson');

describe('jsonToBru stringify', () => {
  describe('body:multipart-form', () => {
    it('handles block strings with contentType annotation', () => {
      const input = {
        http: {
          method: 'post',
          url: 'https://api.example.com/upload'
        },
        body: {
          mode: 'multipartForm',
          multipartForm: [
            {
              name: 'json',
              value: '{\n  "name": "Bob"\n}',
              type: 'text',
              enabled: true,
              contentType: 'application/json'
            },
            {
              name: 'simple',
              value: 'text value',
              type: 'text',
              enabled: true,
              contentType: 'text/plain'
            }
          ]
        }
      };

      const output = stringify(input);

      // Verify the output contains properly formatted block strings
      expect(output).toContain('body:multipart-form {');
      expect(output).toContain('json: \'\'\'');
      expect(output).toContain('@contentType(application/json)');
      expect(output).toContain('simple: text value @contentType(text/plain)');

      // Most importantly: verify round-trip parsing works
      const parsed = parse(output);
      expect(parsed.body.multipartForm).toHaveLength(2);
      expect(parsed.body.multipartForm[0].name).toBe('json');
      expect(parsed.body.multipartForm[0].value).toBe('{\n  "name": "Bob"\n}');
      expect(parsed.body.multipartForm[0].contentType).toBe('application/json');
      expect(parsed.body.multipartForm[1].name).toBe('simple');
      expect(parsed.body.multipartForm[1].value).toBe('text value');
      expect(parsed.body.multipartForm[1].contentType).toBe('text/plain');
    });

    it('handles block strings without contentType annotation', () => {
      const input = {
        http: {
          method: 'post',
          url: 'https://api.example.com/upload'
        },
        body: {
          mode: 'multipartForm',
          multipartForm: [
            {
              name: 'data',
              value: 'line1\nline2\nline3',
              type: 'text',
              enabled: true,
              contentType: ''
            }
          ]
        }
      };

      const output = stringify(input);

      // Verify round-trip parsing works
      const parsed = parse(output);
      expect(parsed.body.multipartForm).toHaveLength(1);
      expect(parsed.body.multipartForm[0].value).toBe('line1\nline2\nline3');
    });
  });

  describe('body:ws', () => {
    it('stringifies a valid bruno request | smoke', () => {
      const input = {
        ws: {
          url: 'ws://localhost:3000',
          body: 'ws'
        },
        body: {
          mode: 'ws',
          ws: [
            {
              content: '{"foo":"bar"}',
              name: 'message 1',
              type: 'json'
            }
          ]
        },
        settings: {
          keepAliveInterval: 30,
          timeout: 250
        }
      };

      const output = stringify(input);

      // generic structure snapshot
      expect(output).toMatchInlineSnapshot(`
        "ws {
          url: ws://localhost:3000
          body: ws
        }

        body:ws {
          name: message 1
          type: json
          content: '''
            {"foo":"bar"}
          '''
        }

        settings {
          keepAliveInterval: 30
          timeout: 250
        }
        "
      `);

      // Hard check if the input settings were stored as is
      expect(output).toMatch(new RegExp(`keepAliveInterval: ${input.settings.keepAliveInterval}`));
      expect(output).toMatch(new RegExp(`timeout: ${input.settings.timeout}`));
    });
  });
});
