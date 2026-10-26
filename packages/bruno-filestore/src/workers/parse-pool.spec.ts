import {
  parseRequestViaWorker,
  stringifyRequest,
  stringifyRequestViaWorker,
  disposeFilestoreWorkers
} from '../index';

const bruRequest = `meta {
  name: Get Users
  type: http
  seq: 1
}

get {
  url: https://api.example.com/users
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
    const yml = stringifyRequest(ymlItem, { format: 'yml' });
    const result = await parseRequestViaWorker(yml, { format: 'yml' });
    expect(result.name).toBe('Get Users');
  });

  it('rejects when the worker cannot parse the file', async () => {
    await expect(parseRequestViaWorker('not a bru request', { format: 'bru' })).rejects.toThrow();
  });
});
