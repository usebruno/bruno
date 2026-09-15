const { bruExampleToJson } = require('../index');

const makeExample = (request) => ({
  name: 'Create User',
  description: '',
  request: { url: 'https://api.example.com/users', ...request },
  response: {
    headers: [],
    status: '201',
    statusText: 'Created',
    body: { type: 'json', content: '{}' }
  }
});

describe('bruExampleToJson - http method casing', () => {
  it('upper-cases the method inherited from the parent request', () => {
    // A .bru block header is lower-case by convention (`post {`), and the raw
    // value is what parseBruRequest hands to the example.
    const result = bruExampleToJson(makeExample({}), true, 'http-request', 'post');

    expect(result.request.method).toBe('POST');
  });

  it("upper-cases the example's own method", () => {
    const result = bruExampleToJson(makeExample({ method: 'delete' }), true, 'http-request', 'DELETE');

    expect(result.request.method).toBe('DELETE');
  });

  it('leaves an already upper-case method unchanged', () => {
    const result = bruExampleToJson(makeExample({ method: 'PATCH' }), true, 'http-request', 'PATCH');

    expect(result.request.method).toBe('PATCH');
  });

  it('preserves special characters in custom methods', () => {
    const result = bruExampleToJson(makeExample({ method: 'm-search' }), true, 'http-request', 'm-search');

    expect(result.request.method).toBe('M-SEARCH');
  });

  it('falls back to GET when no method is present anywhere', () => {
    const result = bruExampleToJson(makeExample({}), true, 'http-request', undefined);

    expect(result.request.method).toBe('GET');
  });

  it('leaves a gRPC method path untouched', () => {
    // gRPC stores a case-sensitive fully-qualified path in the same field.
    const result = bruExampleToJson(
      makeExample({ method: '/helloworld.Greeter/SayHello' }),
      true,
      'grpc-request',
      undefined
    );

    expect(result.request.method).toBe('/helloworld.Greeter/SayHello');
  });
});
