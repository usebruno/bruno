jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() }
}));

jest.mock('../services/sqlite', () => ({ getStatements: jest.fn(), getFiles: jest.fn() }));
jest.mock('../services/runner-exchange', () => ({ readRunnerExchange: jest.fn(), clearRunnerResponses: jest.fn() }));

const { ipcMain } = require('electron');
const { getStatements, getFiles } = require('../services/sqlite');
const { readRunnerExchange, clearRunnerResponses } = require('../services/runner-exchange');
const { registerSqliteIpc } = require('./sqlite');

describe('registerSqliteIpc', () => {
  let statements;
  let files;
  let handlers;

  const invoke = (channel, ...args) => handlers.get(channel)({}, ...args);

  beforeEach(() => {
    ipcMain.handle.mockReset();
    statements = { execute: jest.fn(() => 'result') };
    getStatements.mockReturnValue(statements);
    files = { stat: jest.fn(() => 'entry'), read: jest.fn(async () => 'bytes') };
    getFiles.mockReturnValue(files);
    registerSqliteIpc();
    handlers = new Map(ipcMain.handle.mock.calls);
  });

  it('registers one channel per exposed statement', () => {
    expect([...handlers.keys()]).toEqual([
      'datastore:file-index:file_index_size',
      'datastore:file-index:file_index_clear',
      'datastore:runner_responses:get_runner_response',
      'datastore:runner_responses:delete_runner_responses_for_collection',
      'datastore:files:stat',
      'datastore:files:read'
    ]);
  });

  it('reads the file index size', () => {
    expect(invoke('datastore:file-index:file_index_size')).toBe('result');
    expect(statements.execute).toHaveBeenCalledWith('file_index_size');
  });

  it('clears the file index', () => {
    expect(invoke('datastore:file-index:file_index_clear')).toBe('result');
    expect(statements.execute).toHaveBeenCalledWith('file_index_clear');
  });

  it('looks the statements up on every call', () => {
    const replacement = { execute: jest.fn(() => 'replacement') };
    getStatements.mockReturnValue(replacement);

    expect(invoke('datastore:file-index:file_index_size')).toBe('replacement');
    expect(statements.execute).not.toHaveBeenCalled();
  });

  it('surfaces the error when the database is unavailable', () => {
    getStatements.mockReturnValue({
      execute: () => {
        throw new Error('The database is unavailable, cannot run statement "file_index_size"');
      }
    });

    expect(() => invoke('datastore:file-index:file_index_size')).toThrow('The database is unavailable');
  });

  describe('get_runner_response', () => {
    const channel = 'datastore:runner_responses:get_runner_response';

    beforeEach(() => {
      readRunnerExchange.mockReset().mockResolvedValue('exchange');
    });

    it('returns the exchange rebuilt from the row and its files', async () => {
      expect(await invoke(channel, { request_uid: 'run-1', extra: 'ignored' })).toBe('exchange');
      expect(readRunnerExchange).toHaveBeenCalledWith('run-1');
    });

    it.each([undefined, {}, { request_uid: '' }, { request_uid: 42 }, { request_uid: { id: 'x' } }])(
      'rejects %p without touching the database',
      (params) => {
        expect(() => invoke(channel, params)).toThrow('request_uid must be a non-empty string');
        expect(readRunnerExchange).not.toHaveBeenCalled();
      }
    );
  });

  describe('delete_runner_responses_for_collection', () => {
    const channel = 'datastore:runner_responses:delete_runner_responses_for_collection';

    beforeEach(() => {
      clearRunnerResponses.mockReset().mockResolvedValue(undefined);
    });

    it('clears the rows and their files by collection uid only', async () => {
      await invoke(channel, { collection_uid: 'col-1', extra: 'ignored' });
      expect(clearRunnerResponses).toHaveBeenCalledWith('col-1');
    });

    it.each([undefined, {}, { collection_uid: '' }, { collection_uid: 42 }])(
      'rejects %p without touching the database',
      (params) => {
        expect(() => invoke(channel, params)).toThrow('collection_uid must be a non-empty string');
        expect(clearRunnerResponses).not.toHaveBeenCalled();
      }
    );
  });

  describe.each([
    ['stat', 'entry'],
    ['read', 'bytes']
  ])('files:%s', (method, result) => {
    const channel = `datastore:files:${method}`;

    it('forwards only the file id', async () => {
      expect(await invoke(channel, { id: 7, extra: 'ignored' })).toBe(result);
      expect(files[method]).toHaveBeenCalledWith(7);
    });

    it.each([undefined, {}, { id: 0 }, { id: -1 }, { id: 1.5 }, { id: '7' }, { id: null }, { id: 2 ** 53 }, { id: 1e300 }])(
      'rejects %p without touching the store',
      (params) => {
        expect(() => invoke(channel, params)).toThrow('id must be a positive integer');
        expect(files[method]).not.toHaveBeenCalled();
      }
    );
  });
});
