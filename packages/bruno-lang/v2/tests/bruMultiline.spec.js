const parser = require('../src/bruToJson.js');

describe('bru parser multiline', () => {
  it('should parse multiline body:json with proper indentation', () => {
    const input = `
meta {
  name: test
}

post {
  url: https://example.com
}

body:json {
  '''
  {
    "name": "test",
    "value": 123
  }
  '''
}
`;

    const output = parser(input);
    const expected = {
      meta: {
        name: 'test',
        seq: 1,
        type: 'http'
      },
      http: {
        method: 'post',
        url: 'https://example.com'
      },
      body: {
        json: "\'\'\'\n{\n  \"name\": \"test\",\n  \"value\": 123\n}\n\'\'\'"
      }
    };
    expect(output).toEqual(expected);
  });

  it('should parse multiline body:text with proper indentation', () => {
    const input = `
meta {
  name: test
}

post {
  url: https://example.com
}

body:text {
  '''
  Hello World
  This is a multiline
  text content
  '''
}
`;

    const output = parser(input);
    const expected = {
      meta: {
        name: 'test',
        seq: 1,
        type: 'http'
      },
      http: {
        method: 'post',
        url: 'https://example.com'
      },
      body: {
        text: "\'\'\'\nHello World\nThis is a multiline\ntext content\n\'\'\'"
      }
    };
    expect(output).toEqual(expected);
  });

  it('should parse multiline script:pre-request with proper indentation', () => {
    const input = `
meta {
  name: test
}

get {
  url: https://example.com
}

script:pre-request {
  '''
  console.log('Starting request');
  bru.setVar('timestamp', Date.now());
  '''
}
`;

    const output = parser(input);
    const expected = {
      meta: {
        name: 'test',
        seq: 1,
        type: 'http'
      },
      http: {
        method: 'get',
        url: 'https://example.com'
      },
      script: {
        req: "\'\'\'\nconsole.log('Starting request');\nbru.setVar('timestamp', Date.now());\n\'\'\'"
      }
    };
    expect(output).toEqual(expected);
  });

  it('should parse multiline tests with proper indentation', () => {
    const input = `
meta {
  name: test
}

get {
  url: https://example.com
}

tests {
  '''
  test('Status code is 200', function() {
    expect(res.getStatus()).to.equal(200);
  });

  test('Response has data', function() {
    expect(res.getBody()).to.have.property('data');
  });
  '''
}
`;

    const output = parser(input);
    const expected = {
      meta: {
        name: 'test',
        seq: 1,
        type: 'http'
      },
      http: {
        method: 'get',
        url: 'https://example.com'
      },
      tests: "\'\'\'\ntest('Status code is 200', function() {\n  expect(res.getStatus()).to.equal(200);\n});\n\ntest('Response has data', function() {\n  expect(res.getBody()).to.have.property('data');\n});\n\'\'\'"
    };
    expect(output).toEqual(expected);
  });

  it('should NOT treat single-line content with triple quotes as multiline', () => {
    const input = `
meta {
  name: test
}

post {
  url: https://example.com
}

body:json {
  '''{"name": "test"}'''
}
`;

    const output = parser(input);
    const expected = {
      meta: {
        name: 'test',
        seq: 1,
        type: 'http'
      },
      http: {
        method: 'post',
        url: 'https://example.com'
      },
      body: {
        json: '\'\'\'{"name": "test"}\'\'\''
      }
    };
    expect(output).toEqual(expected);
  });

  it('should handle mixed content in body:json', () => {
    const input = `
meta {
  name: test
}

post {
  url: https://example.com
}

body:json {
  {
    "name": "test",
    "nested": {
      "value": 123
    }
  }
}
`;

    const output = parser(input);
    const expected = {
      meta: {
        name: 'test',
        seq: 1,
        type: 'http'
      },
      http: {
        method: 'post',
        url: 'https://example.com'
      },
      body: {
        json: '{\n  "name": "test",\n  "nested": {\n    "value": 123\n  }\n}'
      }
    };
    expect(output).toEqual(expected);
  });

  it('should parse multiline dictionary values with proper indentation', () => {
    const input = `
meta {
  name: test
}

post {
  url: https://example.com
}

headers {
  content-type: application/json
  custom-header: '''
  This is a multiline
  header value
  '''
}
`;

    const output = parser(input);
    const expected = {
      meta: {
        name: 'test',
        seq: 1,
        type: 'http'
      },
      http: {
        method: 'post',
        url: 'https://example.com'
      },
      headers: [
        {
          name: 'content-type',
          value: 'application/json',
          enabled: true
        },
        {
          name: 'custom-header',
          value: 'is is a multiline\nader value',
          enabled: true
        }
      ]
    };
    expect(output).toEqual(expected);
  });
});
