const bruToJson = require('../src/bruToJson');

describe('comments', () => {
  it('should parse # comments', () => {
    const input = `# This is a comment
meta {
  name: Test Request
  type: http
}

# Another comment
get {
  url: https://api.example.com
}`;

    const output = bruToJson(input);
    expect(output).toEqual({
      meta: {
        name: 'Test Request',
        type: 'http',
        seq: 1
      },
      http: {
        method: 'get',
        url: 'https://api.example.com'
      }
    });
  });

  it('should parse // comments', () => {
    const input = `// This is a comment
meta {
  name: Test Request
  type: http
}

// Another comment
get {
  url: https://api.example.com
}`;

    const output = bruToJson(input);
    expect(output).toEqual({
      meta: {
        name: 'Test Request',
        type: 'http',
        seq: 1
      },
      http: {
        method: 'get',
        url: 'https://api.example.com'
      }
    });
  });

  it('should parse mixed # and // comments', () => {
    const input = `# Hash comment
// Slash comment
meta {
  name: Test Request
  type: http
}

get {
  url: https://api.example.com
}`;

    const output = bruToJson(input);
    expect(output).toEqual({
      meta: {
        name: 'Test Request',
        type: 'http',
        seq: 1
      },
      http: {
        method: 'get',
        url: 'https://api.example.com'
      }
    });
  });

  it('should handle comments at end of file', () => {
    const input = `meta {
  name: Test Request
  type: http
}

get {
  url: https://api.example.com
}
# Comment at the end
`;

    const output = bruToJson(input);
    expect(output).toEqual({
      meta: {
        name: 'Test Request',
        type: 'http',
        seq: 1
      },
      http: {
        method: 'get',
        url: 'https://api.example.com'
      }
    });
  });

  it('should handle empty comments', () => {
    const input = `#
meta {
  name: Test Request
  type: http
}
//
get {
  url: https://api.example.com
}`;

    const output = bruToJson(input);
    expect(output).toEqual({
      meta: {
        name: 'Test Request',
        type: 'http',
        seq: 1
      },
      http: {
        method: 'get',
        url: 'https://api.example.com'
      }
    });
  });

  it('should parse comments inside dictionary blocks', () => {
    const input = `meta {
  # This is a comment inside meta
  name: Test Request
  // Another comment
  type: http
}

headers {
  # Header comment
  Content-Type: application/json
  // Another header comment
  Authorization: Bearer token
}`;

    const output = bruToJson(input);
    expect(output).toEqual({
      meta: {
        name: 'Test Request',
        type: 'http',
        seq: 1
      },
      headers: [
        {
          name: 'Content-Type',
          value: 'application/json',
          enabled: true
        },
        {
          name: 'Authorization',
          value: 'Bearer token',
          enabled: true
        }
      ]
    });
  });

  it('should parse comments inside query params', () => {
    const input = `params:query {
  # Page parameter
  page: 1
  // Limit parameter
  limit: 10
}`;

    const output = bruToJson(input);
    expect(output).toEqual({
      params: [
        {
          name: 'page',
          value: '1',
          enabled: true,
          type: 'query'
        },
        {
          name: 'limit',
          value: '10',
          enabled: true,
          type: 'query'
        }
      ]
    });
  });

  it('should parse comments inside assert blocks', () => {
    const input = `assert {
  # Status assertion
  res.status: eq 200
  // Body assertion
  res.body.success: eq true
}`;

    const output = bruToJson(input);
    expect(output).toEqual({
      assertions: [
        {
          name: 'res.status',
          value: 'eq 200',
          enabled: true
        },
        {
          name: 'res.body.success',
          value: 'eq true',
          enabled: true
        }
      ]
    });
  });

  it('should parse comments inside vars blocks', () => {
    const input = `vars:pre-request {
  # User ID variable
  userId: 123
  // Timestamp variable
  timestamp: {{Date.now()}}
}

vars:post-response {
  # Extract username
  userName: res.body.name
}`;

    const output = bruToJson(input);
    expect(output).toEqual({
      vars: {
        req: [
          {
            name: 'userId',
            value: '123',
            enabled: true,
            local: false
          },
          {
            name: 'timestamp',
            value: '{{Date.now()}}',
            enabled: true,
            local: false
          }
        ],
        res: [
          {
            name: 'userName',
            value: 'res.body.name',
            enabled: true,
            local: false
          }
        ]
      }
    });
  });

  it('should parse comments inside auth blocks', () => {
    const input = `auth:basic {
  # Username field
  username: admin
  // Password field
  password: secret123
}`;

    const output = bruToJson(input);
    expect(output).toEqual({
      auth: {
        basic: {
          username: 'admin',
          password: 'secret123'
        }
      }
    });
  });
});
