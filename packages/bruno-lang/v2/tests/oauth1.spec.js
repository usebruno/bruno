const parser = require('../src/bruToJson');
const jsonToBru = require('../src/jsonToBru');

describe('OAuth 1.0 Authentication', () => {
  describe('bruToJson - OAuth 1.0 parsing', () => {
    it('should parse basic OAuth 1.0 auth block', () => {
      const input = `
get {
  url: https://api.example.com/test
  body: none
  auth: oauth1
}

auth:oauth1 {
  consumer_key: test-key
  consumer_secret: test-secret
  signature_method: HMAC-SHA1
  parameter_transmission: authorization_header
}
`;

      const output = parser(input);

      expect(output.http.method).toBe('get');
      expect(output.auth.oauth1).toBeDefined();
      expect(output.auth.oauth1.consumerKey).toBe('test-key');
      expect(output.auth.oauth1.consumerSecret).toBe('test-secret');
      expect(output.auth.oauth1.signatureMethod).toBe('HMAC-SHA1');
      expect(output.auth.oauth1.parameterTransmission).toBe('authorization_header');
    });

    it('should parse OAuth 1.0 with all fields', () => {
      const input = `
get {
  url: https://api.example.com/test
  body: none
  auth: oauth1
}

auth:oauth1 {
  consumer_key: my-consumer-key
  consumer_secret: my-consumer-secret
  signature_method: HMAC-SHA256
  parameter_transmission: query_param
  request_token_url: https://api.example.com/oauth/request_token
  authorize_url: https://api.example.com/oauth/authorize
  access_token_url: https://api.example.com/oauth/access_token
  callback_url: http://localhost:8080/callback
  verifier: my-verifier
  access_token: my-access-token
  access_token_secret: my-token-secret
  rsa_private_key: -----BEGIN PRIVATE KEY-----
  credentials_id: my-credentials
}
`;

      const output = parser(input);

      expect(output.auth.oauth1).toEqual({
        consumerKey: 'my-consumer-key',
        consumerSecret: 'my-consumer-secret',
        signatureMethod: 'HMAC-SHA256',
        parameterTransmission: 'query_param',
        requestTokenUrl: 'https://api.example.com/oauth/request_token',
        authorizeUrl: 'https://api.example.com/oauth/authorize',
        accessTokenUrl: 'https://api.example.com/oauth/access_token',
        callbackUrl: 'http://localhost:8080/callback',
        verifier: 'my-verifier',
        accessToken: 'my-access-token',
        accessTokenSecret: 'my-token-secret',
        rsaPrivateKey: '-----BEGIN PRIVATE KEY-----',
        credentialsId: 'my-credentials'
      });
    });

    it('should parse OAuth 1.0 with RSA signature method', () => {
      const input = `
post {
  url: https://api.example.com/data
  body: none
  auth: oauth1
}

auth:oauth1 {
  consumer_key: rsa-key
  consumer_secret: rsa-secret
  signature_method: RSA-SHA256
  rsa_private_key: -----BEGIN PRIVATE KEY-----\\nMIIEvQ...\\n-----END PRIVATE KEY-----
}
`;

      const output = parser(input);

      expect(output.auth.oauth1.signatureMethod).toBe('RSA-SHA256');
      expect(output.auth.oauth1.rsaPrivateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('should parse OAuth 1.0 with PLAINTEXT signature', () => {
      const input = `
get {
  url: https://api.example.com/test
  body: none
  auth: oauth1
}

auth:oauth1 {
  consumer_key: plain-key
  consumer_secret: plain-secret
  signature_method: PLAINTEXT
}
`;

      const output = parser(input);

      expect(output.auth.oauth1.signatureMethod).toBe('PLAINTEXT');
    });

    it('should parse OAuth 1.0 with request body parameter transmission', () => {
      const input = `
post {
  url: https://api.example.com/test
  body: json
  auth: oauth1
}

auth:oauth1 {
  consumer_key: key
  consumer_secret: secret
  parameter_transmission: request_body
}

body:json {
  {
    "test": "data"
  }
}
`;

      const output = parser(input);

      expect(output.auth.oauth1.parameterTransmission).toBe('request_body');
    });
  });

  describe('jsonToBru - OAuth 1.0 serialization', () => {
    it('should serialize basic OAuth 1.0 config to .bru format', () => {
      const json = {
        http: {
          method: 'get',
          url: 'https://api.example.com/test',
          body: 'none',
          auth: 'oauth1'
        },
        auth: {
          oauth1: {
            consumerKey: 'test-key',
            consumerSecret: 'test-secret',
            signatureMethod: 'HMAC-SHA1',
            parameterTransmission: 'authorization_header',
            requestTokenUrl: '',
            authorizeUrl: '',
            accessTokenUrl: '',
            callbackUrl: '',
            verifier: '',
            accessToken: '',
            accessTokenSecret: '',
            rsaPrivateKey: '',
            credentialsId: 'credentials'
          }
        }
      };

      const output = jsonToBru(json);

      expect(output).toContain('auth:oauth1 {');
      expect(output).toContain('consumer_key: test-key');
      expect(output).toContain('consumer_secret: test-secret');
      expect(output).toContain('signature_method: HMAC-SHA1');
      expect(output).toContain('parameter_transmission: authorization_header');
    });

    it('should serialize full OAuth 1.0 config with all fields', () => {
      const json = {
        http: {
          method: 'post',
          url: 'https://api.example.com/test',
          body: 'none',
          auth: 'oauth1'
        },
        auth: {
          oauth1: {
            consumerKey: 'full-key',
            consumerSecret: 'full-secret',
            signatureMethod: 'HMAC-SHA256',
            parameterTransmission: 'query_param',
            requestTokenUrl: 'https://api.example.com/oauth/request',
            authorizeUrl: 'https://api.example.com/oauth/auth',
            accessTokenUrl: 'https://api.example.com/oauth/token',
            callbackUrl: 'http://localhost/callback',
            verifier: 'abc123',
            accessToken: 'token123',
            accessTokenSecret: 'secret123',
            rsaPrivateKey: '-----BEGIN KEY-----',
            credentialsId: 'my-creds'
          }
        }
      };

      const output = jsonToBru(json);

      expect(output).toContain('consumer_key: full-key');
      expect(output).toContain('consumer_secret: full-secret');
      expect(output).toContain('signature_method: HMAC-SHA256');
      expect(output).toContain('parameter_transmission: query_param');
      expect(output).toContain('request_token_url: https://api.example.com/oauth/request');
      expect(output).toContain('authorize_url: https://api.example.com/oauth/auth');
      expect(output).toContain('access_token_url: https://api.example.com/oauth/token');
      expect(output).toContain('callback_url: http://localhost/callback');
      expect(output).toContain('verifier: abc123');
      expect(output).toContain('access_token: token123');
      expect(output).toContain('access_token_secret: secret123');
      expect(output).toContain('rsa_private_key: -----BEGIN KEY-----');
      expect(output).toContain('credentials_id: my-creds');
    });

    it('should serialize OAuth 1.0 with RSA signature', () => {
      const json = {
        http: {
          method: 'get',
          url: 'https://api.example.com/test',
          body: 'none',
          auth: 'oauth1'
        },
        auth: {
          oauth1: {
            consumerKey: 'rsa-key',
            consumerSecret: 'rsa-secret',
            signatureMethod: 'RSA-SHA512',
            parameterTransmission: 'authorization_header',
            rsaPrivateKey: '-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----',
            requestTokenUrl: '',
            authorizeUrl: '',
            accessTokenUrl: '',
            callbackUrl: '',
            verifier: '',
            accessToken: '',
            accessTokenSecret: '',
            credentialsId: 'credentials'
          }
        }
      };

      const output = jsonToBru(json);

      expect(output).toContain('signature_method: RSA-SHA512');
      expect(output).toContain('rsa_private_key:');
    });
  });

  describe('Round-trip conversion', () => {
    it('should maintain OAuth 1.0 data through parse and serialize cycle', () => {
      const originalBru = `get {
  url: https://api.example.com/test
  body: none
  auth: oauth1
}

auth:oauth1 {
  consumer_key: round-trip-key
  consumer_secret: round-trip-secret
  signature_method: HMAC-SHA256
  parameter_transmission: query_param
  request_token_url: https://example.com/request
  authorize_url: https://example.com/authorize
  access_token_url: https://example.com/token
  callback_url: http://localhost:3000/callback
  verifier: verifier123
  access_token: token456
  access_token_secret: secret789
  rsa_private_key: key-data
  credentials_id: test-creds
}
`;

      // Parse to JSON
      const parsed = parser(originalBru);

      // Serialize back to .bru
      const serialized = jsonToBru(parsed);

      // Parse again
      const reparsed = parser(serialized);

      // Compare the OAuth 1.0 objects
      expect(reparsed.auth.oauth1).toEqual(parsed.auth.oauth1);
      expect(reparsed.auth.oauth1.consumerKey).toBe('round-trip-key');
      expect(reparsed.auth.oauth1.signatureMethod).toBe('HMAC-SHA256');
      expect(reparsed.auth.oauth1.parameterTransmission).toBe('query_param');
      expect(reparsed.auth.oauth1.accessToken).toBe('token456');
    });

    it('should handle minimal OAuth 1.0 config in round-trip', () => {
      const originalBru = `get {
  url: https://api.example.com/test
  body: none
  auth: oauth1
}

auth:oauth1 {
  consumer_key: min-key
  consumer_secret: min-secret
  signature_method: HMAC-SHA1
  parameter_transmission: authorization_header
  request_token_url:
  authorize_url:
  access_token_url:
  callback_url:
  verifier:
  access_token:
  access_token_secret:
  rsa_private_key:
  credentials_id: credentials
}
`;

      const parsed = parser(originalBru);
      const serialized = jsonToBru(parsed);
      const reparsed = parser(serialized);

      expect(reparsed.auth.oauth1.consumerKey).toBe('min-key');
      expect(reparsed.auth.oauth1.consumerSecret).toBe('min-secret');
      expect(reparsed.auth.oauth1.signatureMethod).toBe('HMAC-SHA1');
    });
  });

  describe('Collection-level OAuth 1.0', () => {
    it('should parse collection-level OAuth 1.0 auth', () => {
      const collectionBruToJson = require('../src/collectionBruToJson');

      const input = `meta {
  name: OAuth 1.0 Collection
  type: collection
}

auth {
  mode: oauth1
}

auth:oauth1 {
  consumer_key: collection-key
  consumer_secret: collection-secret
  signature_method: HMAC-SHA1
  parameter_transmission: authorization_header
  request_token_url:
  authorize_url:
  access_token_url:
  callback_url:
  verifier:
  access_token:
  access_token_secret:
  rsa_private_key:
  credentials_id: credentials
}
`;

      const output = collectionBruToJson(input);

      expect(output.auth.mode).toBe('oauth1');
      expect(output.auth.oauth1).toBeDefined();
      expect(output.auth.oauth1.consumerKey).toBe('collection-key');
      expect(output.auth.oauth1.consumerSecret).toBe('collection-secret');
    });

    it('should serialize collection-level OAuth 1.0 auth', () => {
      const jsonToCollectionBru = require('../src/jsonToCollectionBru');

      const json = {
        meta: {
          name: 'OAuth 1.0 Collection',
          type: 'collection'
        },
        auth: {
          mode: 'oauth1',
          oauth1: {
            consumerKey: 'coll-key',
            consumerSecret: 'coll-secret',
            signatureMethod: 'HMAC-SHA256',
            parameterTransmission: 'authorization_header',
            requestTokenUrl: '',
            authorizeUrl: '',
            accessTokenUrl: '',
            callbackUrl: '',
            verifier: '',
            accessToken: '',
            accessTokenSecret: '',
            rsaPrivateKey: '',
            credentialsId: 'credentials'
          }
        }
      };

      const output = jsonToCollectionBru(json);

      expect(output).toContain('auth {');
      expect(output).toContain('mode: oauth1');
      expect(output).toContain('auth:oauth1 {');
      expect(output).toContain('consumer_key: coll-key');
      expect(output).toContain('consumer_secret: coll-secret');
      expect(output).toContain('signature_method: HMAC-SHA256');
    });
  });
});
