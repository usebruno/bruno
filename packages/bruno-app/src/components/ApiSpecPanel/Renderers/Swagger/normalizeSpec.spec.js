import { normalizeSpecForSwagger } from './normalizeSpec';

describe('normalizeSpecForSwagger', () => {
  it('returns falsy or non-object/string inputs unchanged', () => {
    expect(normalizeSpecForSwagger(null)).toBeNull();
    expect(normalizeSpecForSwagger(undefined)).toBeUndefined();
    expect(normalizeSpecForSwagger(123)).toBe(123);
  });

  it('leaves OpenAPI 3.0.x and 3.1.x specs unchanged in string format', () => {
    const yaml30 = 'openapi: 3.0.3\ninfo:\n  title: Test';
    const yaml31 = 'openapi: "3.1.0"\ninfo:\n  title: Test';
    const json30 = '{"openapi": "3.0.0", "info": {}}';
    expect(normalizeSpecForSwagger(yaml30)).toBe(yaml30);
    expect(normalizeSpecForSwagger(yaml31)).toBe(yaml31);
    expect(normalizeSpecForSwagger(json30)).toBe(json30);
  });

  it('normalizes OpenAPI 3.2.0 and 3.2.1 string specs to 3.1.0', () => {
    const yaml32 = 'openapi: 3.2.0\ninfo:\n  title: Test';
    const yaml321 = 'openapi: 3.2.1\ninfo:\n  title: Test';
    const yamlQuotes = 'openapi: "3.2.1"\ninfo:\n  title: Test';
    const json32 = '{"openapi": "3.2.0", "info": {}}';

    expect(normalizeSpecForSwagger(yaml32)).toBe('openapi: 3.1.0\ninfo:\n  title: Test');
    expect(normalizeSpecForSwagger(yaml321)).toBe('openapi: 3.1.0\ninfo:\n  title: Test');
    expect(normalizeSpecForSwagger(yamlQuotes)).toBe('openapi: "3.1.0"\ninfo:\n  title: Test');
    expect(normalizeSpecForSwagger(json32)).toBe('{"openapi": "3.1.0", "info": {}}');
  });

  it('normalizes OpenAPI 3.2.x object specs to 3.1.0', () => {
    const obj32 = { openapi: '3.2.1', info: { title: 'Test' } };
    const result = normalizeSpecForSwagger(obj32);
    expect(result.openapi).toBe('3.1.0');
    expect(result.info.title).toBe('Test');
  });

  it('leaves OpenAPI 3.0.x and 3.1.x object specs unchanged', () => {
    const obj30 = { openapi: '3.0.0', info: { title: 'Test' } };
    const obj31 = { openapi: '3.1.0', info: { title: 'Test' } };
    expect(normalizeSpecForSwagger(obj30)).toEqual(obj30);
    expect(normalizeSpecForSwagger(obj31)).toEqual(obj31);
  });
});
