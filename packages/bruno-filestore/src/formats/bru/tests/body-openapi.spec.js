const { parseBruRequest, stringifyBruRequest } = require('../index');

describe('OpenAPI request body contract', () => {
  const bru = `meta {
  name: CreateOperation
  type: http
  seq: 3
}

post {
  url: https://example.com/operations
  body: json
  auth: none
}

body:openapi {
  source: ../../openapi.yaml
  operationId: CreateOperation
}

body:json {
  {
    "cost": 20.20
  }
}
`;

  it('parses the contract without introducing a new body mode', () => {
    const item = parseBruRequest(bru);

    expect(item.request.body.mode).toBe('json');
    expect(item.request.bodyContract).toEqual({
      type: 'openapi',
      source: '../../openapi.yaml',
      operationId: 'CreateOperation'
    });
  });

  it('preserves the contract during a parse/stringify round trip', () => {
    const output = stringifyBruRequest(parseBruRequest(bru));

    expect(output).toContain(`body:openapi {
  source: ../../openapi.yaml
  operationId: CreateOperation
}`);
    expect(output).toContain('body:json {');
  });
});
