/**
 * @jest-environment node
 */

import { GrpcClient, splitMethodDescriptors } from './grpc-client';

// hello.proto as a FileDescriptorProto, the shape server reflection hands back for every method
// of hello.HelloService. Captured from the gRPC test server in packages/bruno-tests.
const HELLO_DESCRIPTOR
  = 'CgtoZWxsby5wcm90bxIFaGVsbG8iJAoMSGVsbG9SZXF1ZXN0EhQKCGdyZWV0aW5nGAEgASgJQgIQACIiCg1IZWxsb1Jlc3BvbnNlEhEKBXJlcGx5GAEgASgJQgIQADL/AQoMSGVsbG9TZXJ2aWNlEjUKCFNheUhlbGxvEhMuaGVsbG8uSGVsbG9SZXF1ZXN0GhQuaGVsbG8uSGVsbG9SZXNwb25zZRI8Cg1Mb3RzT2ZSZXBsaWVzEhMuaGVsbG8uSGVsbG9SZXF1ZXN0GhQuaGVsbG8uSGVsbG9SZXNwb25zZTABEj4KD0xvdHNPZkdyZWV0aW5ncxITLmhlbGxvLkhlbGxvUmVxdWVzdBoULmhlbGxvLkhlbGxvUmVzcG9uc2UoARI6CglCaWRpSGVsbG8SEy5oZWxsby5IZWxsb1JlcXVlc3QaFC5oZWxsby5IZWxsb1Jlc3BvbnNlKAEwAWIGcHJvdG8z';

const descriptorBytes = () => Uint8Array.from(Buffer.from(HELLO_DESCRIPTOR, 'base64'));

const reflectedMethod = (path) => ({
  path,
  requestStream: false,
  responseStream: false,
  requestType: {
    format: 'Protocol Buffer 3 DescriptorProto',
    type: { name: 'HelloRequest', field: [{ name: 'greeting', type: 'TYPE_STRING' }] },
    fileDescriptorProtos: [descriptorBytes()]
  },
  responseType: {
    format: 'Protocol Buffer 3 DescriptorProto',
    type: { name: 'HelloResponse', field: [{ name: 'reply', type: 'TYPE_STRING' }] },
    fileDescriptorProtos: [descriptorBytes()]
  }
});

describe('splitMethodDescriptors', () => {
  it('dedupes the descriptors every method of a service repeats', () => {
    const methods = [reflectedMethod('/hello.HelloService/SayHello'), reflectedMethod('/hello.HelloService/BidiHello')];

    const { descriptors } = splitMethodDescriptors(methods);

    // 2 methods x request + response = 4 copies of the one file
    expect(descriptors).toEqual([HELLO_DESCRIPTOR]);
  });

  it('keeps the field metadata the request pane generates sample messages from', () => {
    const { methods } = splitMethodDescriptors([reflectedMethod('/hello.HelloService/SayHello')]);

    expect(methods[0].requestType.type.field).toEqual([{ name: 'greeting', type: 'TYPE_STRING' }]);
    expect(methods[0].requestType).not.toHaveProperty('fileDescriptorProtos');
    expect(methods[0].responseType).not.toHaveProperty('fileDescriptorProtos');
  });

  it('reads descriptor bytes that have been through JSON', () => {
    // A Uint8Array serializes to an array-like object, which is how the descriptors reach storage
    const serialized = JSON.parse(JSON.stringify(reflectedMethod('/hello.HelloService/SayHello')));

    expect(splitMethodDescriptors([serialized]).descriptors).toEqual([HELLO_DESCRIPTOR]);
  });

  it('tolerates methods that carry no descriptors', () => {
    expect(splitMethodDescriptors([{ path: '/a/B' }])).toEqual({ methods: [{ path: '/a/B', requestType: undefined, responseType: undefined }], descriptors: [] });
    expect(splitMethodDescriptors()).toEqual({ methods: [], descriptors: [] });
  });
});

describe('GrpcClient.loadMethodsFromDescriptors', () => {
  it('restores the serializers that could not be stored', () => {
    const client = new GrpcClient(() => { });

    const methods = client.loadMethodsFromDescriptors([HELLO_DESCRIPTOR]);

    expect(methods.map((method) => method.path).sort()).toEqual([
      '/hello.HelloService/BidiHello',
      '/hello.HelloService/LotsOfGreetings',
      '/hello.HelloService/LotsOfReplies',
      '/hello.HelloService/SayHello'
    ]);

    const sayHello = client.methods.get('/hello.HelloService/SayHello');
    expect(typeof sayHello.requestSerialize).toBe('function');
    expect(typeof sayHello.responseDeserialize).toBe('function');
    expect(sayHello.requestSerialize({ greeting: 'hi' })).toBeInstanceOf(Buffer);
  });

  it('classifies the streaming kind of each rebuilt method', () => {
    const client = new GrpcClient(() => { });

    const byPath = Object.fromEntries(
      client.loadMethodsFromDescriptors([HELLO_DESCRIPTOR]).map((method) => [method.path, method.type])
    );

    expect(byPath).toEqual({
      '/hello.HelloService/SayHello': 'unary',
      '/hello.HelloService/LotsOfReplies': 'server-streaming',
      '/hello.HelloService/LotsOfGreetings': 'client-streaming',
      '/hello.HelloService/BidiHello': 'bidi-streaming'
    });
  });

  it('registers nothing when there are no descriptors to rebuild from', () => {
    const client = new GrpcClient(() => { });

    expect(client.loadMethodsFromDescriptors()).toEqual([]);
    expect(client.methods.size).toBe(0);
  });

  it('round-trips what splitMethodDescriptors stored', () => {
    const { descriptors } = splitMethodDescriptors([reflectedMethod('/hello.HelloService/SayHello')]);
    const coldClient = new GrpcClient(() => { });

    coldClient.loadMethodsFromDescriptors(descriptors);

    expect(coldClient.methods.has('/hello.HelloService/SayHello')).toBe(true);
  });
});
