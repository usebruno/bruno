/**
 * This test file is used to test the text parser.
 */
const parser = require('../src/bruToJson');

describe('script parser', () => {
  it('should parse request script', () => {
    const input = `
script:pre-request {
  $req.setHeader('Content-Type', 'application/json');
}
`;

    const output = parser(input);
    const expected = {
      script: {
        req: '$req.setHeader(\'Content-Type\', \'application/json\');'
      }
    };
    expect(output).toEqual(expected);
  });

  it('should parse response script', () => {
    const input = `
script:post-response {
  expect(response.status).to.equal(200);
}
`;

    const output = parser(input);
    const expected = {
      script: {
        res: 'expect(response.status).to.equal(200);'
      }
    };
    expect(output).toEqual(expected);
  });

  it('should parse grpc before-call-start script', () => {
    const input = `
script:grpc:before-call-start {
  req.setMetadata('authorization', 'Bearer token');
}
`;

    const output = parser(input);
    const expected = {
      script: {
        beforeCallStart: 'req.setMetadata(\'authorization\', \'Bearer token\');'
      }
    };
    expect(output).toEqual(expected);
  });

  it('should parse grpc after-call-end script', () => {
    const input = `
script:grpc:after-call-end {
  expect(res.getStatusCode()).to.equal(0);
}
`;

    const output = parser(input);
    const expected = {
      script: {
        afterCallEnd: 'expect(res.getStatusCode()).to.equal(0);'
      }
    };
    expect(output).toEqual(expected);
  });

  it('should parse grpc before-message-send script', () => {
    const input = `
script:grpc:before-message-send {
  expect(bru.grpc.request.message.data).to.be.an('object');
}
`;

    const output = parser(input);
    const expected = {
      script: {
        beforeMessageSend: 'expect(bru.grpc.request.message.data).to.be.an(\'object\');'
      }
    };
    expect(output).toEqual(expected);
  });

  it('should parse grpc after-message-receive script', () => {
    const input = `
script:grpc:after-message-receive {
  expect(bru.grpc.response.message.data).to.be.an('object');
}
`;

    const output = parser(input);
    const expected = {
      script: {
        afterMessageReceive: 'expect(bru.grpc.response.message.data).to.be.an(\'object\');'
      }
    };
    expect(output).toEqual(expected);
  });

  it('should merge all six script blocks present in a single file', () => {
    const input = `
script:pre-request {
  req.setHeader('Content-Type', 'application/json');
}

script:post-response {
  expect(res.status).to.equal(200);
}

script:grpc:before-call-start {
  req.setMetadata('authorization', 'Bearer token');
}

script:grpc:after-call-end {
  expect(res.getStatusCode()).to.equal(0);
}

script:grpc:before-message-send {
  bru.setVar('sent', bru.grpc.request.message.timestamp);
}

script:grpc:after-message-receive {
  bru.setVar('received', bru.grpc.response.message.timestamp);
}
`;

    const output = parser(input);
    const expected = {
      script: {
        req: 'req.setHeader(\'Content-Type\', \'application/json\');',
        res: 'expect(res.status).to.equal(200);',
        beforeCallStart: 'req.setMetadata(\'authorization\', \'Bearer token\');',
        afterCallEnd: 'expect(res.getStatusCode()).to.equal(0);',
        beforeMessageSend: 'bru.setVar(\'sent\', bru.grpc.request.message.timestamp);',
        afterMessageReceive: 'bru.setVar(\'received\', bru.grpc.response.message.timestamp);'
      }
    };
    expect(output).toEqual(expected);
  });
});
