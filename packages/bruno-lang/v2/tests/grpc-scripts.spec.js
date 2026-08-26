const bruToJson = require('../src/bruToJson');
const jsonToBru = require('../src/jsonToBru');

const grpcJson = () => ({
  meta: { name: 'SayHello', type: 'grpc', seq: 1 },
  grpc: { url: '{{host}}', method: '/hello.HelloService/SayHello', body: 'grpc', methodType: 'unary' },
  script: {
    beforeCallStart: 'console.log("before call start");',
    beforeMessageSend: 'console.log("before message send");',
    afterMessageReceive: 'console.log("after message receive");',
    afterCallEnd: 'console.log("after call end");'
  }
});

describe('gRPC phase scripts — .bru serialization', () => {
  it('stringifies each phase into its own script:grpc:<phase> block', () => {
    const bru = jsonToBru(grpcJson());
    expect(bru).toContain('script:grpc:before-call-start {');
    expect(bru).toContain('script:grpc:before-message-send {');
    expect(bru).toContain('script:grpc:after-message-receive {');
    expect(bru).toContain('script:grpc:after-call-end {');
    expect(bru).toContain('console.log("before call start");');
  });

  it('parses the phase blocks back into request.script fields', () => {
    const json = bruToJson(jsonToBru(grpcJson()));
    expect(json.script).toEqual({
      beforeCallStart: 'console.log("before call start");',
      beforeMessageSend: 'console.log("before message send");',
      afterMessageReceive: 'console.log("after message receive");',
      afterCallEnd: 'console.log("after call end");'
    });
  });

  it('round-trips losslessly (parse → stringify → parse)', () => {
    const first = bruToJson(jsonToBru(grpcJson()));
    const second = bruToJson(jsonToBru(first));
    expect(second.script).toEqual(first.script);
    expect(second.grpc).toEqual(first.grpc);
  });

  it('does not emit a block for an empty, null, or missing phase', () => {
    const json = grpcJson();
    json.script.beforeMessageSend = '';
    json.script.afterMessageReceive = null;
    delete json.script.afterCallEnd;

    const bru = jsonToBru(json);
    expect(bru).toContain('script:grpc:before-call-start {');
    expect(bru).not.toContain('script:grpc:before-message-send');
    expect(bru).not.toContain('script:grpc:after-message-receive');
    expect(bru).not.toContain('script:grpc:after-call-end');

    expect(bruToJson(bru).script).toEqual({ beforeCallStart: 'console.log("before call start");' });
  });
});
