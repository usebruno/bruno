import {
  buildSkippedFilesMessage,
  buildExportWarningsMessage,
  buildSpecVariables,
  getEnvironmentVariablesKeyValuePairs
} from './apiSpec';

describe('getEnvironmentVariablesKeyValuePairs', () => {
  it('ignores variables that are switched off or left blank', () => {
    const variables = [
      { name: 'baseUrl', value: 'https://api.test', enabled: true },
      { name: 'disabled', value: 'x', enabled: false },
      { name: 'blank', value: '', enabled: true },
      { name: '', value: 'noName', enabled: true }
    ];
    expect(getEnvironmentVariablesKeyValuePairs(variables)).toEqual({ baseUrl: 'https://api.test' });
  });

  it('keeps a variable whose value is off or zero, which a typed environment really can hold', () => {
    const variables = [
      { name: 'featureOff', value: false, enabled: true },
      { name: 'retries', value: 0, enabled: true }
    ];
    expect(getEnvironmentVariablesKeyValuePairs(variables)).toEqual({ featureOff: false, retries: 0 });
  });

  it('leaves out a secret, because its value never leaves the secrets store', () => {
    const variables = [
      { name: 'token', value: '', enabled: true, secret: true },
      { name: 'baseUrl', value: 'https://api.test', enabled: true }
    ];
    expect(getEnvironmentVariablesKeyValuePairs(variables)).toEqual({ baseUrl: 'https://api.test' });
  });

  it('leaves out a secret even when it arrives with its value', () => {
    const variables = [
      { name: 'token', value: 'decrypted-token', enabled: true, secret: true },
      { name: 'baseUrl', value: 'https://api.test', enabled: true }
    ];
    expect(getEnvironmentVariablesKeyValuePairs(variables)).toEqual({ baseUrl: 'https://api.test' });
  });
});

describe('buildSpecVariables', () => {
  const envVariables = {
    Local: [{ name: 'baseUrl', value: 'https://local.test', enabled: true }],
    Prod: [{ name: 'baseUrl', value: 'https://prod.test', enabled: true }]
  };

  it('lets the chosen environment win over a collection variable of the same name', () => {
    const variables = buildSpecVariables({
      collectionVariables: { baseUrl: 'https://collection.test', other: 'kept' },
      envVariables,
      environment: 'Prod'
    });
    expect(variables.baseUrl).toBe('https://prod.test');
    expect(variables.other).toBe('kept');
  });

  it('keeps the collection variables when no environment is chosen', () => {
    const variables = buildSpecVariables({
      collectionVariables: { baseUrl: 'https://collection.test' },
      envVariables,
      environment: ''
    });
    expect(variables.baseUrl).toBe('https://collection.test');
  });

  it('does not let a secret base url with a value into the merged variables', () => {
    const variables = buildSpecVariables({
      collectionVariables: { other: 'kept' },
      envVariables: { Prod: [{ name: 'baseUrl', value: 'https://secret-host.test', enabled: true, secret: true }] },
      environment: 'Prod'
    });
    expect(variables).toEqual({ other: 'kept' });
  });

  it('keeps the placeholder when an enabled secret in the environment overrides a collection variable', () => {
    const variables = buildSpecVariables({
      collectionVariables: { host: 'https://collection-host.test', other: 'kept' },
      envVariables: { Prod: [{ name: 'host', value: '', enabled: true, secret: true }] },
      environment: 'Prod'
    });
    expect(variables).toEqual({ other: 'kept' });
  });

  it('keeps the collection value when the secret with the same name is switched off', () => {
    const variables = buildSpecVariables({
      collectionVariables: { host: 'https://collection-host.test' },
      envVariables: { Prod: [{ name: 'host', value: '', enabled: false, secret: true }] },
      environment: 'Prod'
    });
    expect(variables).toEqual({ host: 'https://collection-host.test' });
  });

  it('keeps the placeholder when the environment has a secret and a plain variable of the same name', () => {
    const variables = buildSpecVariables({
      collectionVariables: {},
      envVariables: {
        Prod: [
          { name: 'host', value: '', enabled: true, secret: true },
          { name: 'host', value: 'https://plain-host.test', enabled: true }
        ]
      },
      environment: 'Prod'
    });
    expect(variables).toEqual({});
  });

  it('copes with a collection that has nothing in it', () => {
    expect(buildSpecVariables({})).toEqual({});
  });

  it('copes with an environment name that does not exist', () => {
    const variables = buildSpecVariables({ collectionVariables: { a: '1' }, envVariables, environment: 'Missing' });
    expect(variables).toEqual({ a: '1' });
  });
});

describe('buildSkippedFilesMessage', () => {
  const files = (count) => Array.from({ length: count }, (_, i) => `File${i + 1}.bru`);

  it('says "it was skipped" when only one file could not be read', () => {
    expect(buildSkippedFilesMessage(['Broken.bru'])).toBe('Could not parse Broken.bru; it was skipped');
  });

  it('says "they were skipped" when several files could not be read', () => {
    expect(buildSkippedFilesMessage(files(2))).toBe('Could not parse File1.bru, File2.bru; they were skipped');
  });

  it('lists all the file names when there are few enough to show', () => {
    const message = buildSkippedFilesMessage(files(5));
    expect(message).toBe(
      'Could not parse File1.bru, File2.bru, File3.bru, File4.bru, File5.bru; they were skipped'
    );
    expect(message).not.toContain('more');
  });

  it('shows the first few file names and counts how many others there were', () => {
    expect(buildSkippedFilesMessage(files(8))).toBe(
      'Could not parse File1.bru, File2.bru, File3.bru, File4.bru, File5.bru and 3 more; they were skipped'
    );
  });

  it('never floods the message with names, even when hundreds of files were skipped', () => {
    const message = buildSkippedFilesMessage(files(200));
    expect(message.match(/File\d+\.bru/g)).toHaveLength(5);
    expect(message).toContain('and 195 more');
  });

  it('always matches the leftover count to the names it left out', () => {
    const message = buildSkippedFilesMessage(files(9));
    expect(message.match(/File\d+\.bru/g)).toHaveLength(5);
    expect(message).toContain('and 4 more');
  });
});

describe('buildExportWarningsMessage', () => {
  it('says "warning" when only one request could not be read fully', () => {
    expect(buildExportWarningsMessage(['GetUsers.bru'])).toBe(
      'Created with 1 warning; some request bodies could not be fully parsed'
    );
  });

  it('says "warnings" when several requests could not be read fully', () => {
    expect(buildExportWarningsMessage(['GetUsers.bru', 'CreateUser.bru'])).toBe(
      'Created with 2 warnings; some request bodies could not be fully parsed'
    );
  });

  it('counts every warning, however many there are', () => {
    expect(buildExportWarningsMessage(new Array(12).fill('Broken.bru'))).toContain('Created with 12 warnings');
  });
});
