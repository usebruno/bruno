import {
  parseRequestViaWorker,
  parseFolderViaWorker,
  parseEnvironmentViaWorker,
  stringifyRequest,
  stringifyRequestViaWorker,
  stringifyFolder,
  stringifyEnvironment,
  disposeFilestoreWorkers
} from '../index';
import { runParsePoolTask } from './parse-pool';

const bruRequest = `meta {
  name: Get Users
  type: http
  seq: 1
}

get {
  url: https://api.example.com/users
}
`;

const bruFolder = `meta {
  name: auth
}
`;

const bruEnvironment = `
vars {
  url: http://localhost:3000
}
`;

const ymlItem = {
  uid: 'req-1',
  type: 'http-request',
  name: 'Get Users',
  seq: 1,
  request: {
    method: 'GET',
    url: 'https://api.example.com/users'
  }
};

describe('parse worker pool', () => {
  afterEach(async () => {
    await disposeFilestoreWorkers();
  });

  it('parses a bru request via the shared worker pool', async () => {
    const result = await parseRequestViaWorker(bruRequest, { format: 'bru' });
    expect(result.name).toBe('Get Users');
  });

  it('stringifies a parsed request via the shared worker pool', async () => {
    const parsed = await parseRequestViaWorker(bruRequest, { format: 'bru' });
    const output = await stringifyRequestViaWorker(parsed, { format: 'bru' });
    expect(output).toContain('name: Get Users');
  });

  it('parses a yml request via the shared worker pool', async () => {
    const yml = stringifyRequest(ymlItem as any, { format: 'yml' });
    const result = await parseRequestViaWorker(yml, { format: 'yml' });
    expect(result.name).toBe('Get Users');
  });

  it('rejects when the worker cannot parse the file', async () => {
    await expect(parseRequestViaWorker('not a bru request', { format: 'bru' })).rejects.toThrow();
  });

  it('parses a bru folder via the shared worker pool', async () => {
    const result = await parseFolderViaWorker(bruFolder, { format: 'bru' });
    expect(result.meta.name).toBe('auth');
  });

  it('parses a yml folder via the shared worker pool', async () => {
    const yml = stringifyFolder({ meta: { name: 'auth' } }, { format: 'yml' });
    const result = await parseFolderViaWorker(yml, { format: 'yml' });
    expect(result.meta.name).toBe('auth');
  });

  it('parses a bru environment via the shared worker pool', async () => {
    const result = await parseEnvironmentViaWorker(bruEnvironment, { format: 'bru' });
    expect(result.variables[0]).toMatchObject({
      name: 'url',
      value: 'http://localhost:3000'
    });
  });

  it('parses a yml environment via the shared worker pool', async () => {
    const yml = stringifyEnvironment({
      uid: 'env-1',
      name: 'Dev',
      variables: [{
        uid: 'v1',
        name: 'url',
        value: 'http://localhost:3000',
        type: 'text',
        enabled: true,
        secret: false
      }]
    } as any, { format: 'yml' });
    const result = await parseEnvironmentViaWorker(yml, { format: 'yml' });
    expect(result.variables[0]).toMatchObject({
      name: 'url',
      value: 'http://localhost:3000'
    });
  });

  it('parses many requests concurrently through the shared pool', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => parseRequestViaWorker(bruRequest, { format: 'bru' }))
    );

    expect(results).toHaveLength(20);
    expect(results.every((result) => result.name === 'Get Users')).toBe(true);
  });

  it('stringifies many requests concurrently through the shared pool', async () => {
    const parsed = await parseRequestViaWorker(bruRequest, { format: 'bru' });
    const outputs = await Promise.all(
      Array.from({ length: 20 }, () => stringifyRequestViaWorker(parsed, { format: 'bru' }))
    );

    expect(outputs).toHaveLength(20);
    expect(outputs.every((output) => output.includes('name: Get Users'))).toBe(true);
  });

  it('rejects when the worker throws for an unknown task type', async () => {
    await expect(runParsePoolTask('not-a-task' as any, bruRequest, 'bru')).rejects.toThrow(/Unknown task type/);
  });

  it('can parse again after the pool is disposed during in-flight work', async () => {
    const pending = Array.from({ length: 30 }, () => parseRequestViaWorker(bruRequest, { format: 'bru' }));
    const settled = await Promise.allSettled([
      disposeFilestoreWorkers(),
      ...pending
    ]);

    expect(settled.every((result) => result.status === 'fulfilled' || result.status === 'rejected')).toBe(true);

    const result = await parseRequestViaWorker(bruRequest, { format: 'bru' });
    expect(result.name).toBe('Get Users');
  });
});
