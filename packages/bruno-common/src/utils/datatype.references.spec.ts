import { parseValueByDataType, validateDataTypeValue } from './datatype';

const server = { server: { host: 'localhost', port: 8080, secure: true } };
const ports = { ports: [8080, 9090] };
const featureFlags = { featureFlags: [true, false] };

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

    // Matches ../interpolate's `[^}]+` — such a name resolves at request time, so validation must agree.
    it('an identifier containing spaces', () => {
      expect(parseValueByDataType('{{api key}}', 'string', { 'api key': 'secret' })).toBe('secret');
    });
  });

  describe('does not resolve — falls through to normal coercion', () => {
    it('partial reference (user-{{userId}})', () => {
      expect(parseValueByDataType('user-{{userId}}', 'number', { userId: 42 })).toBe('user-{{userId}}');
    });

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

describe('parseValueByDataType + validateDataTypeValue — mismatch surfaces', () => {
  const validateRef = (value: string, dataType: any, variables: Record<string, any>) =>
    validateDataTypeValue(parseValueByDataType(value, dataType, variables), dataType);

  it('flags a nested boolean reference for every dataType except boolean and string', () => {
    expect(validateRef('{{server.secure}}', 'boolean', server)).toBeNull();
    expect(validateRef('{{server.secure}}', 'string', server)).toBeNull();
    expect(validateRef('{{server.secure}}', 'number', server)).toBe('Value is not a valid number');
    expect(validateRef('{{server.secure}}', 'object', server)).toBe('Value is not a valid object');
  });

  it('flags a nested number reference for every dataType except number and string', () => {
    expect(validateRef('{{server.port}}', 'number', server)).toBeNull();
    expect(validateRef('{{server.port}}', 'string', server)).toBeNull();
    expect(validateRef('{{server.port}}', 'boolean', server)).toBe('Value is not a valid boolean');
    expect(validateRef('{{server.port}}', 'object', server)).toBe('Value is not a valid object');
  });

  it('flags an array-index reference by the element type', () => {
    expect(validateRef('{{featureFlags.0}}', 'boolean', featureFlags)).toBeNull();
    expect(validateRef('{{featureFlags.0}}', 'number', featureFlags)).toBe('Value is not a valid number');
    expect(validateRef('{{ports.0}}', 'number', ports)).toBeNull();
    expect(validateRef('{{ports}}', 'object', ports)).toBeNull();
  });

  it('flags a resolved value that only looks like the declared type', () => {
    expect(validateRef('{{rawConfig}}', 'object', { rawConfig: '{"host":"localhost"}' })).toBe(
      'Value is not a valid object'
    );
    expect(validateRef('{{secure}}', 'number', { secure: true })).toBe('Value is not a valid number');
  });
});
