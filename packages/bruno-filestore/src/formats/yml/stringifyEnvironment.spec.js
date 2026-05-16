const { parseEnvironment, stringifyEnvironment } = require('../../index');

describe('stringifyEnvironment', () => {
  it('preserves non-string variable values by serializing them as strings', () => {
    const yml = stringifyEnvironment(
      {
        name: 'Global',
        variables: [
          {
            uid: 'var-1',
            name: 'TestA',
            value: '123',
            type: 'text',
            enabled: true,
            secret: false
          },
          {
            uid: 'var-2',
            name: 'TestB',
            value: 456,
            type: 'text',
            enabled: true,
            secret: false
          }
        ]
      },
      { format: 'yml' }
    );

    const parsed = parseEnvironment(yml, { format: 'yml' });

    expect(parsed.variables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'TestA', value: '123' }),
        expect.objectContaining({ name: 'TestB', value: '456' })
      ])
    );
  });
});
