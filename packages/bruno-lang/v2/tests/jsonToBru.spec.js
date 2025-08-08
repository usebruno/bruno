const jsonToBru = require('../src/jsonToBru');

describe('jsonToBru - value normalization', () => {
  it('should normalize newlines in meta name to spaces', () => {
    const input = {
      meta: {
        name: 'API for\nuser\nmanagement',
        type: 'http',
        seq: 1
      }
    };

    const output = jsonToBru(input);
    const expected = `meta {
  name: API for user management
  type: http
  seq: 1
}
`;

    expect(output).toEqual(expected);
  });

  it('should not normalize newlines in other meta fields', () => {
    const input = {
      meta: {
        name: 'Test API',
        type: 'http',
        seq: 1,
        customField: 'value\nwith\nnewlines'
      }
    };

    const output = jsonToBru(input);
    const expected = `meta {
  name: Test API
  type: http
  seq: 1
  customField: value\nwith\nnewlines
}
`;

    expect(output).toEqual(expected);
  });

  it('should handle multiple consecutive newlines in name', () => {
    const input = {
      meta: {
        name: 'API\n\n\nwith\n\nmultiple\nnewlines',
        type: 'http',
        seq: 1
      }
    };

    const output = jsonToBru(input);
    const expected = `meta {
  name: API with multiple newlines
  type: http
  seq: 1
}
`;

    expect(output).toEqual(expected);
  });

  it('should handle carriage returns and line feeds in name', () => {
    const input = {
      meta: {
        name: 'API\r\nwith\rCRLF\nand\rCR',
        type: 'http',
        seq: 1
      }
    };

    const output = jsonToBru(input);
    const expected = `meta {
  name: API with CRLF and CR
  type: http
  seq: 1
}
`;

    expect(output).toEqual(expected);
  });

  it('should trim whitespace after normalization in name', () => {
    const input = {
      meta: {
        name: '  API with\nspaces  ',
        type: 'http',
        seq: 1
      }
    };

    const output = jsonToBru(input);
    const expected = `meta {
  name: API with spaces
  type: http
  seq: 1
}
`;

    expect(output).toEqual(expected);
  });
});
