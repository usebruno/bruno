import { parseValueByDataType, validateVariableType } from './datatype';

const server = { server: { host: 'localhost', port: 8080, secure: true } };
const ports = { ports: [8080, 9090] };
const featureFlags = { featureFlags: [true, false] };
const abc = { abc: { hello: { test: '123' } } };

describe('parseValueByDataType — reference resolution', () => {
  describe('resolves whole-string references', () => {
    it('flat name', () => {
      expect(parseValueByDataType('{{host}}', 'string', { host: 'localhost' })).toBe('localhost');
      expect(parseValueByDataType('{{port}}', 'number', { port: 8080 })).toBe(8080);
      expect(parseValueByDataType('{{secure}}', 'boolean', { secure: true })).toBe(true);
      expect(parseValueByDataType('{{server}}', 'object', server)).toEqual(server.server);
    });

    it('nested dotted path', () => {
      expect(parseValueByDataType('{{server.host}}', 'string', server)).toBe('localhost');
      expect(parseValueByDataType('{{server.port}}', 'number', server)).toBe(8080);
      expect(parseValueByDataType('{{server.secure}}', 'boolean', server)).toBe(true);
    });

    it('a nested object, not just its leaf fields', () => {
      expect(parseValueByDataType('{{abc.hello}}', 'object', abc)).toEqual({ test: '123' });
      expect(parseValueByDataType('{{server}}', 'object', server)).toEqual(server.server);
    });

    it('numeric segment walks arrays', () => {
      expect(parseValueByDataType('{{ports.0}}', 'number', ports)).toBe(8080);
      expect(parseValueByDataType('{{featureFlags.1}}', 'boolean', featureFlags)).toBe(false);
    });

    it('bare array reference returns the array itself', () => {
      expect(parseValueByDataType('{{ports}}', 'object', ports)).toEqual([8080, 9090]);
    });

    it('a literal dotted key wins over walking the dotted path', () => {
      const variables = { 'server.port': 9090, 'server': { port: 8080 } };
      expect(parseValueByDataType('{{server.port}}', 'number', variables)).toBe(9090);
    });

    it('surrounding whitespace inside braces is tolerated', () => {
      expect(parseValueByDataType('  {{ server.port }}  ', 'number', server)).toBe(8080);
    });

    it('an identifier containing spaces', () => {
      expect(parseValueByDataType('{{api key}}', 'string', { 'api key': 'secret' })).toBe('secret');
    });
  });

  describe('does not resolve — falls through to normal coercion', () => {
    it('unknown variable ({{missingVar}})', () => {
      expect(parseValueByDataType('{{missingVar}}', 'number', {})).toBe('{{missingVar}}');
    });

    it('resolvableVariables arg omitted entirely', () => {
      expect(parseValueByDataType('{{port}}', 'number')).toBe('{{port}}');
    });

    it('variable declared but set to undefined', () => {
      expect(parseValueByDataType('{{port}}', 'number', { port: undefined })).toBe('{{port}}');
      expect(parseValueByDataType('{{port}}', 'string', { port: undefined })).toBe('{{port}}');
    });

    it('out-of-bounds array index', () => {
      expect(parseValueByDataType('{{ports.5}}', 'number', ports)).toBe('{{ports.5}}');
    });
  });

  describe('returns the resolved value uncoerced', () => {
    it('a JSON-shaped string is not re-parsed under declared:object', () => {
      expect(parseValueByDataType('{{rawConfig}}', 'object', { rawConfig: '{"host":"localhost"}' })).toBe(
        '{"host":"localhost"}'
      );
    });

    it('the referenced type is authoritative — declared type is ignored', () => {
      expect(parseValueByDataType('{{port}}', 'string', { port: 8080 })).toBe(8080);
      expect(parseValueByDataType('{{port}}', undefined, { port: 8080 })).toBe(8080);
    });
  });
});

describe('validateVariableType — mismatch surfaces', () => {
  it('flags a nested boolean reference for every dataType except boolean and string', () => {
    expect(validateVariableType('{{server.secure}}', 'boolean', server)).toBeNull();
    expect(validateVariableType('{{server.secure}}', 'string', server)).toBeNull();
    expect(validateVariableType('{{server.secure}}', 'number', server)).toBe('Value is not a valid number');
    expect(validateVariableType('{{server.secure}}', 'object', server)).toBe('Value is not a valid object');
  });

  it('accepts a reference to a nested object under declared:object', () => {
    expect(validateVariableType('{{abc.hello}}', 'object', abc)).toBeNull();
    expect(validateVariableType('{{abc.hello}}', 'number', abc)).toBe('Value is not a valid number');
    expect(validateVariableType('{{abc.hello.test}}', 'object', abc)).toBe('Value is not a valid object');
    expect(validateVariableType('{{abc.hello.test}}', 'string', abc)).toBeNull();
  });

  it('flags a nested number reference for every dataType except number and string', () => {
    expect(validateVariableType('{{server.port}}', 'number', server)).toBeNull();
    expect(validateVariableType('{{server.port}}', 'string', server)).toBeNull();
    expect(validateVariableType('{{server.port}}', 'boolean', server)).toBe('Value is not a valid boolean');
    expect(validateVariableType('{{server.port}}', 'object', server)).toBe('Value is not a valid object');
  });

  it('flags an array-index reference by the element type', () => {
    expect(validateVariableType('{{featureFlags.0}}', 'boolean', featureFlags)).toBeNull();
    expect(validateVariableType('{{featureFlags.0}}', 'number', featureFlags)).toBe('Value is not a valid number');
    expect(validateVariableType('{{ports.0}}', 'number', ports)).toBeNull();
    expect(validateVariableType('{{ports}}', 'object', ports)).toBeNull();
  });

  it('flags a resolved value that only looks like the declared type', () => {
    expect(validateVariableType('{{rawConfig}}', 'object', { rawConfig: '{"host":"localhost"}' })).toBe(
      'Value is not a valid object'
    );
    expect(validateVariableType('{{secure}}', 'number', { secure: true })).toBe('Value is not a valid number');
  });
});
