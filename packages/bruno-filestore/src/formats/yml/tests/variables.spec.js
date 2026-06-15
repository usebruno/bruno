import { toBrunoVariables, toOpenCollectionVariables } from '../common/variables';

describe('yml variables - typed values (collection / folder / request vars)', () => {
  it('reads a typed value keeping the value as a string and the type in datatype', () => {
    const ocVariables = [
      { name: 'var_str', value: 'plain' },
      { name: 'var_num', value: { type: 'number', data: '300' } },
      { name: 'var_bool', value: { type: 'boolean', data: 'false' } },
      { name: 'var_obj', value: { type: 'object', data: '{"scope":"folder"}' } }
    ];

    const { req } = toBrunoVariables(ocVariables);

    expect(req.find((v) => v.name === 'var_str')).toMatchObject({ value: 'plain' });
    expect(req.find((v) => v.name === 'var_str')).not.toHaveProperty('datatype');
    expect(req.find((v) => v.name === 'var_num')).toMatchObject({ value: '300', datatype: 'number' });
    expect(req.find((v) => v.name === 'var_bool')).toMatchObject({ value: 'false', datatype: 'boolean' });
    expect(req.find((v) => v.name === 'var_obj')).toMatchObject({ value: '{"scope":"folder"}', datatype: 'object' });
  });

  it('writes datatype back as a { type, data } value, leaving plain strings untouched', () => {
    const brunoVariables = [
      { uid: 'u1', name: 'var_str', value: 'plain', enabled: true, local: false },
      { uid: 'u2', name: 'var_num', value: '300', datatype: 'number', enabled: true, local: false }
    ];

    const ocVariables = toOpenCollectionVariables(brunoVariables);

    expect(ocVariables).toEqual([
      { name: 'var_str', value: 'plain' },
      { name: 'var_num', value: { type: 'number', data: '300' } }
    ]);
  });
});
