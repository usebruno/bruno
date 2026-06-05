jest.mock('nanoid', () => ({
  nanoid: () => 'aaaaaaaaaaaaaaaaaaaa1',
  customAlphabet: () => () => 'aaaaaaaaaaaaaaaaaaaa1'
}));

import { buildEnvVariable, stripEnvVarUid, buildPersistedEnvVariables } from './environments';

describe('buildEnvVariable — datatype preservation for env export/import', () => {
  it('preserves non-string datatypes on non-secret variables', () => {
    expect(buildEnvVariable({ envVariable: { name: 'count', value: 42, secret: false, datatype: 'number' } }))
      .toEqual({ name: 'count', value: 42, type: 'text', enabled: true, secret: false, datatype: 'number' });

    expect(buildEnvVariable({ envVariable: { name: 'flag', value: true, secret: false, datatype: 'boolean' } }))
      .toEqual({ name: 'flag', value: true, type: 'text', enabled: true, secret: false, datatype: 'boolean' });

    expect(buildEnvVariable({ envVariable: { name: 'cfg', value: { k: 1 }, secret: false, datatype: 'object' } }))
      .toEqual({ name: 'cfg', value: { k: 1 }, type: 'text', enabled: true, secret: false, datatype: 'object' });
  });

  it('drops `datatype: \'string\'` (the implicit default)', () => {
    const out = buildEnvVariable({ envVariable: { name: 'greeting', value: 'hi', secret: false, datatype: 'string' } });
    expect(out).toEqual({ name: 'greeting', value: 'hi', type: 'text', enabled: true, secret: false });
    expect(out.datatype).toBeUndefined();
  });

  it('drops datatype on secret variables and clears their value', () => {
    const out = buildEnvVariable({ envVariable: { name: 'token', value: 'shh', secret: true, datatype: 'number' } });
    expect(out).toEqual({ name: 'token', value: '', type: 'text', enabled: true, secret: true });
    expect(out.datatype).toBeUndefined();
  });

  it('attaches a uid when withUuid is true', () => {
    const out = buildEnvVariable({
      envVariable: { name: 'count', value: 42, secret: false, datatype: 'number' },
      withUuid: true
    });
    expect(out.uid).toEqual(expect.any(String));
    expect(out).toMatchObject({ name: 'count', value: 42, datatype: 'number' });
  });
});

describe('stripEnvVarUid — datatype-aware comparison key', () => {
  it('keeps non-string datatypes', () => {
    expect(stripEnvVarUid({ uid: 'u', name: 'count', value: 42, type: 'text', enabled: true, secret: false, datatype: 'number' }))
      .toEqual({ name: 'count', value: 42, type: 'text', enabled: true, secret: false, datatype: 'number' });
  });

  it('drops `datatype: \'string\'`', () => {
    expect(stripEnvVarUid({ uid: 'u', name: 'greeting', value: 'hi', type: 'text', enabled: true, secret: false, datatype: 'string' }))
      .toEqual({ name: 'greeting', value: 'hi', type: 'text', enabled: true, secret: false });
  });

  it('drops datatype on secrets', () => {
    expect(stripEnvVarUid({ uid: 'u', name: 'token', value: '', type: 'text', enabled: true, secret: true, datatype: 'number' }))
      .toEqual({ name: 'token', value: '', type: 'text', enabled: true, secret: true });
  });
});

describe('Env export → import round-trip via JSON', () => {
  it('preserves datatype across export → JSON.stringify → JSON.parse → import for every supported type', () => {
    const reduxEnvVars = [
      { uid: 'u1', name: 'count', value: 42, type: 'text', enabled: true, secret: false, datatype: 'number' },
      { uid: 'u2', name: 'flag', value: true, type: 'text', enabled: true, secret: false, datatype: 'boolean' },
      { uid: 'u3', name: 'cfg', value: { k: 1 }, type: 'text', enabled: true, secret: false, datatype: 'object' },
      { uid: 'u4', name: 'greeting', value: 'hi', type: 'text', enabled: true, secret: false, datatype: 'string' },
      { uid: 'u5', name: 'plain', value: 'hello', type: 'text', enabled: true, secret: false },
      { uid: 'u6', name: 'token', value: 'shh', type: 'text', enabled: true, secret: true, datatype: 'number' }
    ];

    const exported = reduxEnvVars.map((envVariable) => buildEnvVariable({ envVariable }));
    const onDisk = JSON.parse(JSON.stringify(exported));

    expect(onDisk[0]).toMatchObject({ name: 'count', value: 42, datatype: 'number', secret: false });
    expect(onDisk[1]).toMatchObject({ name: 'flag', value: true, datatype: 'boolean', secret: false });
    expect(onDisk[2]).toMatchObject({ name: 'cfg', value: { k: 1 }, datatype: 'object', secret: false });
    expect(onDisk[3]).toMatchObject({ name: 'greeting', value: 'hi', secret: false });
    expect(onDisk[3].datatype).toBeUndefined();
    expect(onDisk[4]).toMatchObject({ name: 'plain', value: 'hello', secret: false });
    expect(onDisk[4].datatype).toBeUndefined();
    expect(onDisk[5]).toMatchObject({ name: 'token', value: '', secret: true });
    expect(onDisk[5].datatype).toBeUndefined();

    const reimported = onDisk.map((envVariable) => buildEnvVariable({ envVariable, withUuid: true }));
    expect(reimported[0]).toMatchObject({ name: 'count', value: 42, datatype: 'number', secret: false });
    expect(reimported[1]).toMatchObject({ name: 'flag', value: true, datatype: 'boolean', secret: false });
    expect(reimported[2]).toMatchObject({ name: 'cfg', value: { k: 1 }, datatype: 'object', secret: false });
    expect(reimported[3]).toMatchObject({ name: 'greeting', value: 'hi', secret: false });
    expect(reimported[3].datatype).toBeUndefined();
    expect(reimported[4]).toMatchObject({ name: 'plain', value: 'hello', secret: false });
    expect(reimported[4].datatype).toBeUndefined();
    expect(reimported[5]).toMatchObject({ name: 'token', value: '', secret: true });
    expect(reimported[5].datatype).toBeUndefined();
  });
});

describe('buildPersistedEnvVariables — save mode', () => {
  // Regression guard: save mode must commit the visible value of an ephemeral
  // var, not roll it back to persistedValue.
  it('keeps the visible value when an ephemeral var has a persistedValue', () => {
    const variables = [
      {
        name: 'apiKey',
        value: 'testvalue',
        type: 'text',
        enabled: true,
        secret: true,
        ephemeral: true,
        persistedValue: 'test'
      }
    ];

    expect(buildPersistedEnvVariables(variables, { mode: 'save' })).toEqual([
      { name: 'apiKey', value: 'testvalue', type: 'text', enabled: true, secret: true }
    ]);
  });

  it('keeps the visible value for a non-secret ephemeral var too', () => {
    const variables = [
      {
        name: 'host',
        value: 'localhost-from-script',
        type: 'text',
        enabled: true,
        secret: false,
        ephemeral: true,
        persistedValue: 'localhost'
      }
    ];

    expect(buildPersistedEnvVariables(variables, { mode: 'save' })).toEqual([
      { name: 'host', value: 'localhost-from-script', type: 'text', enabled: true, secret: false }
    ]);
  });

  it('strips ephemeral/persistedValue from non-ephemeral vars', () => {
    const variables = [
      {
        name: 'plain',
        value: 'v',
        type: 'text',
        enabled: true,
        secret: false,
        ephemeral: false,
        persistedValue: 'leftover'
      }
    ];

    expect(buildPersistedEnvVariables(variables, { mode: 'save' })).toEqual([
      { name: 'plain', value: 'v', type: 'text', enabled: true, secret: false }
    ]);
  });
});
