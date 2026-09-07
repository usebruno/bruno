const GrpcMessage = require('../src/grpc/grpc-message');

describe('GrpcMessage', () => {
  test('exposes the payload and the timestamp it was stamped with', () => {
    const message = new GrpcMessage({ data: { greeting: 'hi' }, timestamp: 1700000000 });

    expect(message.data).toEqual({ greeting: 'hi' });
    expect(message.timestamp).toBe(1700000000);
  });

  test('data is a clone, so editing it cannot reach what the call sends', () => {
    const source = { data: { greeting: 'hi' }, timestamp: 1700000000 };
    const message = new GrpcMessage(source);

    message.data.greeting = 'tampered';

    expect(source.data).toEqual({ greeting: 'hi' });
  });

  test('data and timestamp are own enumerable fields, which is what makes them survive QuickJS marshalling', () => {
    // `marshallToVm` copies properties with `for...in`, so a getter on the prototype would be
    // invisible inside the sandbox while working fine in node-vm. This assertion is the only one
    // a getter-based refactor would fail.
    const message = new GrpcMessage({ data: { greeting: 'hi' }, timestamp: 1700000000 });

    expect(Object.keys(message)).toEqual(['data', 'timestamp']);
  });

  test('an empty message yields undefined fields rather than throwing', () => {
    const message = new GrpcMessage();

    expect(message.data).toBeUndefined();
    expect(message.timestamp).toBeUndefined();
  });
});
