import parseItem from './parseItem';

// The yml layer used to pass `http.method` through verbatim in both directions,
// so a lower-case verb written into opencollection.yml survived every round trip
// and reached Generate Code as `curl --request post`. Reading canonicalises it.

describe('parseItem — http method casing', () => {
  it('upper-cases a lower-case verb on the request and its examples', () => {
    const yml = `info:
  name: create-user
  type: http

http:
  url: https://api.example.com/users
  method: post

examples:
  - name: Created
    request:
      url: https://api.example.com/users
      method: post
    response:
      status: 201
`;

    const item = parseItem(yml) as any;

    expect(item.request.method).toBe('POST');
    expect(item.examples[0].request.method).toBe('POST');
  });

  it('leaves an already upper-case verb unchanged', () => {
    const yml = `info:
  name: get-user
  type: http

http:
  url: https://api.example.com/users/1
  method: GET
`;

    expect((parseItem(yml) as any).request.method).toBe('GET');
  });

  it('preserves special characters in custom methods', () => {
    const yml = `info:
  name: discover
  type: http

http:
  url: https://api.example.com/discover
  method: m-search
`;

    expect((parseItem(yml) as any).request.method).toBe('M-SEARCH');
  });

  it('defaults to GET when the verb is missing', () => {
    const yml = `info:
  name: no-method
  type: http

http:
  url: https://api.example.com/users
`;

    expect((parseItem(yml) as any).request.method).toBe('GET');
  });

  it('upper-cases the graphql verb too', () => {
    const yml = `info:
  name: gql
  type: graphql

graphql:
  url: https://api.example.com/graphql
  method: post
`;

    expect((parseItem(yml) as any).request.method).toBe('POST');
  });

  it('leaves the gRPC method path untouched', () => {
    const yml = `info:
  name: say-hello
  type: grpc

grpc:
  url: grpc://localhost:50051
  method: /helloworld.Greeter/SayHello
`;

    expect((parseItem(yml) as any).request.method).toBe('/helloworld.Greeter/SayHello');
  });
});
