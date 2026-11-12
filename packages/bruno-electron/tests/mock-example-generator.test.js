const { schemaToExample } = require('../src/app/mock-server/mock-example-generator');

describe('schemaToExample numeric bounds', () => {
  it('honours a minimum above the default maximum', () => {
    expect(schemaToExample({ type: 'integer', minimum: 1000 })).toBeGreaterThanOrEqual(1000);
    expect(schemaToExample({ type: 'number', minimum: 1000 })).toBeGreaterThanOrEqual(1000);
  });

  it('honours a maximum below the default minimum', () => {
    expect(schemaToExample({ type: 'integer', maximum: -5 })).toBeLessThanOrEqual(-5);
  });

  it('honours the bounds when faker is not installed', () => {
    jest.isolateModules(() => {
      jest.doMock('@faker-js/faker', () => {
        throw new Error('Cannot find module');
      });
      const { schemaToExample: withoutFaker } = require('../src/app/mock-server/mock-example-generator');

      expect(withoutFaker({ type: 'integer', minimum: 1000 })).toBe(1000);
      expect(withoutFaker({ type: 'number', minimum: 1000 })).toBe(1000);
      expect(withoutFaker({ type: 'integer', maximum: -5 })).toBeLessThanOrEqual(-5);
    });
  });
});
