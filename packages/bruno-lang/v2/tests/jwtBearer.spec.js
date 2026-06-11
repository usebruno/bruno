const parser = require('../src/bruToJson');
const stringify = require('../src/jsonToBru');

describe('auth:jwtbearer', () => {
  describe('bruToJson', () => {
    it('parses algorithm, secret and inline payload', () => {
      const input = `
auth:jwtbearer {
  algorithm: HS256
  secret: bruno
  payload: {"iss":"issuer"}
}
`;

      const expected = {
        auth: {
          jwtBearer: {
            algorithm: 'HS256',
            secret: 'bruno',
            payload: '{"iss":"issuer"}'
          }
        }
      };

      expect(parser(input)).toEqual(expected);
    });

    it('parses multiline payload wrapped in triple quotes', () => {
      const input = `
auth:jwtbearer {
  algorithm: HS512
  secret: {{SECRET}}
  payload: '''
    {
      "iss": "{{ISS}}",
      "aud": "configurations"
    }
  '''
}
`;

      const output = parser(input);

      expect(output.auth.jwtBearer.algorithm).toBe('HS512');
      expect(output.auth.jwtBearer.secret).toBe('{{SECRET}}');
      // Multiline triple-quoted values keep their indentation as-is between the delimiters
      expect(output.auth.jwtBearer.payload).toContain('"iss": "{{ISS}}"');
      expect(output.auth.jwtBearer.payload).toContain('"aud": "configurations"');
    });

    it('defaults algorithm to HS256 when omitted', () => {
      const input = `
auth:jwtbearer {
  secret: s
  payload: {}
}
`;
      expect(parser(input).auth.jwtBearer.algorithm).toBe('HS256');
    });
  });

  describe('jsonToBru', () => {
    it('serializes a jwtBearer auth block with inline payload', () => {
      const input = {
        auth: {
          jwtBearer: {
            algorithm: 'HS256',
            secret: 'bruno',
            payload: '{"iss":"issuer"}'
          }
        }
      };

      const output = stringify(input);
      expect(output).toContain('auth:jwtbearer {');
      expect(output).toContain('algorithm: HS256');
      expect(output).toContain('secret: bruno');
      expect(output).toContain('payload: {"iss":"issuer"}');
    });

    it('wraps multiline payload with triple quotes', () => {
      const input = {
        auth: {
          jwtBearer: {
            algorithm: 'HS256',
            secret: 's',
            payload: '{\n  "iss": "x"\n}'
          }
        }
      };

      const output = stringify(input);
      expect(output).toContain('payload: \'\'\'');
      expect(output).toContain('"iss": "x"');
    });
  });

  describe('round-trip', () => {
    it('preserves jwtBearer through serialize → parse', () => {
      const original = {
        auth: {
          jwtBearer: {
            algorithm: 'HS384',
            secret: '{{SECRET}}',
            payload: '{"iss":"i","aud":"a"}'
          }
        }
      };

      const bru = stringify(original);
      const reparsed = parser(bru);
      expect(reparsed.auth.jwtBearer).toEqual(original.auth.jwtBearer);
    });
  });
});
