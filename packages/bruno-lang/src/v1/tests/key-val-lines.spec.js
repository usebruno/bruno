const { between, regex, anyChar, many, choice } = require('arcsecond');
const _ = require('lodash');

const keyValLines = require('../src/key-val-lines');

const begin = regex(/^vars\s*\r?\n/);
const end = regex(/^[\r?\n]*\/vars\s*[\r?\n]*/);

const varsTag = between(begin)(end)(keyValLines).map(([variables]) => {
  return {
    variables
  };
});

const toJson = (fileContents) => {
  const parser = many(choice([varsTag, anyChar]));

  const parsed = parser.run(fileContents).result.reduce((acc, item) => _.merge(acc, item), {});

  const json = {
    variables: parsed.variables || []
  };

  return json;
};

describe('bool-key-val', () => {
  it('should parse bool-key-val - case 1', () => {
    const file = `
vars
  1 host https://www.google.com
/vars
`;

    const result = toJson(file);
    expect(result).toEqual({
      variables: [
        {
          enabled: true,
          name: 'host',
          value: 'https://www.google.com'
        }
      ]
    });
  });

  it('should parse bool-key-val - case 2', () => {
    const file = `
vars
  1 host https://www.google.com
  1 auth jwt secret
/vars
`;

    const result = toJson(file);
    expect(result).toEqual({
      variables: [
        {
          enabled: true,
          name: 'host',
          value: 'https://www.google.com'
        },
        {
          enabled: true,
          name: 'auth',
          value: 'jwt secret'
        }
      ]
    });
  });

  // following test cases are for edge cases

  // one line with just enabled flag
  it('should parse bool-key-val - case 3', () => {
    const file = `
vars
  1
/vars
`;
    const result = toJson(file);
    expect(result).toEqual({
      variables: [
        {
          enabled: true,
          name: '',
          value: ''
        }
      ]
    });
  });

  // one line with just enabled flag and a space
  it('should parse bool-key-val - case 4', () => {
    const file = `
vars
  1 
/vars
`;
    const result = toJson(file);
    expect(result).toEqual({
      variables: [
        {
          enabled: true,
          name: '',
          value: ''
        }
      ]
    });
  });

  // one line with just enabled flag and a space and a name
  it('should parse bool-key-val - case 5', () => {
    const file = `
vars
  1 host
/vars
`;
    const result = toJson(file);
    expect(result).toEqual({
      variables: [
        {
          enabled: true,
          name: 'host',
          value: ''
        }
      ]
    });
  });

  // one line with just enabled flag and a space and a name and a space
  it('should parse bool-key-val - case 6', () => {
    const file = `
vars
  1 host 
/vars
`;
    const result = toJson(file);
    expect(result).toEqual({
      variables: [
        {
          enabled: true,
          name: 'host',
          value: ''
        }
      ]
    });
  });

  // three lines, second line with just enabled flag
  it('should parse bool-key-val - case 7', () => {
    const file = `
vars
  1 host https://www.google.com
  1
  0 Content-type application/json
/vars
`;
    const result = toJson(file);
    expect(result).toEqual({
      variables: [
        {
          enabled: true,
          name: 'host',
          value: 'https://www.google.com'
        },
        {
          enabled: true,
          name: '',
          value: ''
        },
        {
          enabled: false,
          name: 'Content-type',
          value: 'application/json'
        }
      ]
    });
  });

  // three lines, second line with just enabled flag and a space
  it('should parse bool-key-val - case 8', () => {
    const file = `
vars
  1 host https://www.google.com
  1 
  0 Content-type application/json
/vars
`;
    const result = toJson(file);
    expect(result).toEqual({
      variables: [
        {
          enabled: true,
          name: 'host',
          value: 'https://www.google.com'
        },
        {
          enabled: true,
          name: '',
          value: ''
        },
        {
          enabled: false,
          name: 'Content-type',
          value: 'application/json'
        }
      ]
    });
  });

  // three lines, second line with just enabled flag and a space and a name
  it('should parse bool-key-val - case 9', () => {
    const file = `
vars
  1 host https://www.google.com
  1 auth
  0 Content-type application/json
/vars
`;
    const result = toJson(file);
    expect(result).toEqual({
      variables: [
        {
          enabled: true,
          name: 'host',
          value: 'https://www.google.com'
        },
        {
          enabled: true,
          name: 'auth',
          value: ''
        },
        {
          enabled: false,
          name: 'Content-type',
          value: 'application/json'
        }
      ]
    });
  });
});
