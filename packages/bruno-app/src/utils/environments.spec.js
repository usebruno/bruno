jest.mock('nanoid', () => ({
  nanoid: () => 'aaaaaaaaaaaaaaaaaaaa1',
  customAlphabet: () => () => 'aaaaaaaaaaaaaaaaaaaa1'
}));

import { buildEnvVariable, stripEnvVarUid, buildPersistedEnvVariables } from './environments';

describe('buildEnvVariable — dataType preservation for env export/import', () => {
  it('preserves non-string datatypes on non-secret variables', () => {
    expect(buildEnvVariable({ envVariable: { name: 'count', value: 42, secret: false, dataType: 'number' } }))
      .toEqual({ name: 'count', value: 42, type: 'text', enabled: true, secret: false, dataType: 'number' });

    expect(buildEnvVariable({ envVariable: { name: 'flag', value: true, secret: false, dataType: 'boolean' } }))
      .toEqual({ name: 'flag', value: true, type: 'text', enabled: true, secret: false, dataType: 'boolean' });

    expect(buildEnvVariable({ envVariable: { name: 'cfg', value: { k: 1 }, secret: false, dataType: 'object' } }))
      .toEqual({ name: 'cfg', value: { k: 1 }, type: 'text', enabled: true, secret: false, dataType: 'object' });
  });

  it('drops `dataType: \'string\'` (the implicit default)', () => {
    const out = buildEnvVariable({ envVariable: { name: 'greeting', value: 'hi', secret: false, dataType: 'string' } });
    expect(out).toEqual({ name: 'greeting', value: 'hi', type: 'text', enabled: true, secret: false });
    expect(out.dataType).toBeUndefined();
  });

  it('keeps dataType on secret variables but clears their value', () => {
    const out = buildEnvVariable({ envVariable: { name: 'token', value: 'shh', secret: true, dataType: 'number' } });
    expect(out).toEqual({ name: 'token', value: '', type: 'text', enabled: true, secret: true, dataType: 'number' });
  });

  it('attaches a uid when withUuid is true', () => {
    const out = buildEnvVariable({
      envVariable: { name: 'count', value: 42, secret: false, dataType: 'number' },
      withUuid: true
    });
    expect(out.uid).toEqual(expect.any(String));
    expect(out).toMatchObject({ name: 'count', value: 42, dataType: 'number' });
  });
});

describe('stripEnvVarUid — datatype-aware comparison key', () => {
  it('keeps non-string datatypes', () => {
    expect(stripEnvVarUid({ uid: 'u', name: 'count', value: 42, type: 'text', enabled: true, secret: false, dataType: 'number' }))
      .toEqual({ name: 'count', value: 42, type: 'text', enabled: true, secret: false, dataType: 'number' });
  });

  it('drops `dataType: \'string\'`', () => {
    expect(stripEnvVarUid({ uid: 'u', name: 'greeting', value: 'hi', type: 'text', enabled: true, secret: false, dataType: 'string' }))
      .toEqual({ name: 'greeting', value: 'hi', type: 'text', enabled: true, secret: false });
  });

  it('keeps dataType on secrets', () => {
    expect(stripEnvVarUid({ uid: 'u', name: 'token', value: '', type: 'text', enabled: true, secret: true, dataType: 'number' }))
      .toEqual({ name: 'token', value: '', type: 'text', enabled: true, secret: true, dataType: 'number' });
  });
});

describe('Env export → import round-trip via JSON', () => {
  it('preserves dataType across export → JSON.stringify → JSON.parse → import for every supported type', () => {
    const reduxEnvVars = [
      { uid: 'u1', name: 'count', value: 42, type: 'text', enabled: true, secret: false, dataType: 'number' },
      { uid: 'u2', name: 'flag', value: true, type: 'text', enabled: true, secret: false, dataType: 'boolean' },
      { uid: 'u3', name: 'cfg', value: { k: 1 }, type: 'text', enabled: true, secret: false, dataType: 'object' },
      { uid: 'u4', name: 'greeting', value: 'hi', type: 'text', enabled: true, secret: false, dataType: 'string' },
      { uid: 'u5', name: 'plain', value: 'hello', type: 'text', enabled: true, secret: false },
      { uid: 'u6', name: 'token', value: 'shh', type: 'text', enabled: true, secret: true, dataType: 'number' }
    ];

    const exported = reduxEnvVars.map((envVariable) => buildEnvVariable({ envVariable }));
    const onDisk = JSON.parse(JSON.stringify(exported));

    expect(onDisk[0]).toMatchObject({ name: 'count', value: 42, dataType: 'number', secret: false });
    expect(onDisk[1]).toMatchObject({ name: 'flag', value: true, dataType: 'boolean', secret: false });
    expect(onDisk[2]).toMatchObject({ name: 'cfg', value: { k: 1 }, dataType: 'object', secret: false });
    expect(onDisk[3]).toMatchObject({ name: 'greeting', value: 'hi', secret: false });
    expect(onDisk[3].dataType).toBeUndefined();
    expect(onDisk[4]).toMatchObject({ name: 'plain', value: 'hello', secret: false });
    expect(onDisk[4].dataType).toBeUndefined();
    expect(onDisk[5]).toMatchObject({ name: 'token', value: '', secret: true, dataType: 'number' });

    const reimported = onDisk.map((envVariable) => buildEnvVariable({ envVariable, withUuid: true }));
    expect(reimported[0]).toMatchObject({ name: 'count', value: 42, dataType: 'number', secret: false });
    expect(reimported[1]).toMatchObject({ name: 'flag', value: true, dataType: 'boolean', secret: false });
    expect(reimported[2]).toMatchObject({ name: 'cfg', value: { k: 1 }, dataType: 'object', secret: false });
    expect(reimported[3]).toMatchObject({ name: 'greeting', value: 'hi', secret: false });
    expect(reimported[3].dataType).toBeUndefined();
    expect(reimported[4]).toMatchObject({ name: 'plain', value: 'hello', secret: false });
    expect(reimported[4].dataType).toBeUndefined();
    expect(reimported[5]).toMatchObject({ name: 'token', value: '', secret: true, dataType: 'number' });
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
