const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const quote = (value: string): string =>
  `'${value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;

// A `__proto__` property name in an object initializer invokes the prototype setter, quoted or
// not; only a computed key emits it as a data property.
const key = (name: string): string => {
  if (name === '__proto__') return `[${quote(name)}]`;
  return IDENTIFIER.test(name) ? name : quote(name);
};

export const literal = (value: unknown, indent = ''): string => {
  if (typeof value === 'string') return quote(value);

  if (Array.isArray(value)) {
    const items = value.map((item) => `${indent}  ${literal(item, `${indent}  `)}`);
    return items.length ? `[\n${items.join(',\n')}\n${indent}]` : '[]';
  }

  if (typeof value === 'object' && value !== null) {
    const properties = Object.entries(value).map(([name, item]) =>
      `${indent}  ${key(name)}: ${literal(item, `${indent}  `)}`);
    return properties.length ? `{\n${properties.join(',\n')}\n${indent}}` : '{}';
  }

  return String(value);
};
