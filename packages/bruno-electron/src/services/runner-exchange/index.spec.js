const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { LARGE_RESPONSE_BYTES, MAX_RENDERABLE_RESPONSE_BYTES } = require('@usebruno/common');

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  app: {
    on: jest.fn(),
    getPath: jest.fn(() => require('node:os').tmpdir()),
    getVersion: jest.fn(() => '1.0.0')
  }
}));

jest.mock('../sqlite', () => ({ getStatements: jest.fn(), getFiles: jest.fn() }));

const EVENT_DATA = { collectionUid: 'col-1', itemUid: 'item-1' };

const REQUEST_SENT = { method: 'GET', url: 'https://example.com/userinfo', headers: {} };

describe('runner-exchange service', () => {
  let getStatements;
  let getFiles;
  let error;

  beforeEach(() => {
    jest.resetModules();
    ({ getStatements, getFiles } = require('../sqlite'));
    error = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    error.mockRestore();
  });

  const INLINE_MAX = 64;
  let opened;
  let filesDir;
  let readRunnerExchange;
  let storeRunnerExchange;
  let saveRunnerResponseBody;
  let clearRunnerResponses;

  const roundTrip = async ({ requestSent, responseReceived, disableParsingResponseJson }) => {
    if (requestSent) {
      await storeRunnerExchange({ requestUid: 'run-1', eventData: EVENT_DATA, requestSent });
    }
    await storeRunnerExchange({ requestUid: 'run-1', eventData: EVENT_DATA, responseReceived, disableParsingResponseJson });
    return readRunnerExchange('run-1');
  };

  const responseWithBody = (body, headers = { 'content-type': 'application/json' }) => {
    const dataBuffer = Buffer.from(body);
    const { data } = jest.requireActual('../../utils/common').parseDataFromResponse({ data: dataBuffer, headers });
    return { status: 200, statusText: 'OK', headers, duration: 34, size: dataBuffer.length, data, dataBuffer: dataBuffer.toString('base64') };
  };

  beforeEach(() => {
    const { createDatabase } = require('@usebruno/sqlite');
    filesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-runner-exchange-'));
    opened = createDatabase(':memory:', { filesDir, inlineMaxBytes: INLINE_MAX });
    getStatements.mockReturnValue(opened.statements);
    getFiles.mockReturnValue(opened.files);
    ({ readRunnerExchange, storeRunnerExchange, saveRunnerResponseBody, clearRunnerResponses } = require('./index'));
  });

  afterEach(() => {
    opened.db.close();
    fs.rmSync(filesDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('returns null when nothing was stored', async () => {
    expect(await readRunnerExchange('missing')).toBeNull();
  });

  it('rebuilds the parsed json body from the stored bytes', async () => {
    const responseReceived = responseWithBody('{"ok":true}');

    const exchange = await roundTrip({ requestSent: REQUEST_SENT, responseReceived });

    expect(exchange.requestSent).toEqual(REQUEST_SENT);
    expect(exchange.responseReceived).toEqual(responseReceived);
    expect(exchange.responseReceived.data).toEqual({ ok: true });
  });

  it('rebuilds a body that spilled to disk', async () => {
    const payload = { items: Array.from({ length: 20 }, (_, i) => ({ id: i })) };
    const responseReceived = responseWithBody(JSON.stringify(payload));

    const exchange = await roundTrip({ responseReceived });

    expect(fs.readdirSync(filesDir).length).toBeGreaterThan(0);
    expect(exchange.responseReceived).toEqual(responseReceived);
    expect(exchange.responseReceived.data).toEqual(payload);
  });

  it('keeps the body a string when json parsing was disabled', async () => {
    const responseReceived = { ...responseWithBody('{"ok":true}'), data: '{"ok":true}' };

    const exchange = await roundTrip({ responseReceived, disableParsingResponseJson: true });

    expect(exchange.responseReceived.data).toBe('{"ok":true}');
  });

  it('decodes the body with the charset from the headers', async () => {
    const headers = { 'content-type': 'text/plain; charset=latin1' };
    const dataBuffer = Buffer.from('caf\u00e9', 'latin1');
    const responseReceived = {
      status: 200,
      headers,
      data: 'caf\u00e9',
      dataBuffer: dataBuffer.toString('base64')
    };

    const exchange = await roundTrip({ responseReceived });

    expect(exchange.responseReceived.data).toBe('caf\u00e9');
    expect(exchange.responseReceived.dataBuffer).toBe(dataBuffer.toString('base64'));
  });

  it('rebuilds an empty body', async () => {
    const responseReceived = { status: 204, statusText: 'No Content', headers: {}, data: '', dataBuffer: '' };

    const exchange = await roundTrip({ responseReceived });

    expect(exchange.responseReceived).toEqual(responseReceived);
  });

  describe('by body size', () => {
    const body = JSON.stringify({ items: Array.from({ length: 20 }, (_, i) => ({ id: i })) });

    const storeWithBodySize = async (size) => {
      await roundTrip({ requestSent: REQUEST_SENT, responseReceived: responseWithBody(body) });
      const { stat } = opened.files;
      jest.spyOn(opened.files, 'stat').mockImplementation((id) => ({ ...stat.call(opened.files, id), size }));
      jest.spyOn(opened.files, 'read');
    };

    it('returns a body that is large but still renderable on demand', async () => {
      await storeWithBodySize(LARGE_RESPONSE_BYTES + 1);

      const { responseReceived } = await readRunnerExchange('run-1');

      expect(responseReceived.dataBuffer).toBe(Buffer.from(body).toString('base64'));
      expect(responseReceived.data).toEqual(JSON.parse(body));
    });

    it('returns a body right at the renderable limit', async () => {
      await storeWithBodySize(MAX_RENDERABLE_RESPONSE_BYTES);

      expect((await readRunnerExchange('run-1')).responseReceived.dataBuffer).toBe(Buffer.from(body).toString('base64'));
    });
  });

  describe('when the body is over the renderable limit', () => {
    const body = JSON.stringify({ items: Array.from({ length: 20 }, (_, i) => ({ id: i })) });

    beforeEach(async () => {
      await roundTrip({ requestSent: REQUEST_SENT, responseReceived: responseWithBody(body) });
      const { stat } = opened.files;
      jest.spyOn(opened.files, 'stat').mockImplementation((id) => ({ ...stat.call(opened.files, id), size: MAX_RENDERABLE_RESPONSE_BYTES + 1 }));
      jest.spyOn(opened.files, 'read');
    });

    it('returns the metadata without the body', async () => {
      const { responseReceived } = await readRunnerExchange('run-1');

      expect(responseReceived).toMatchObject({ status: 200, statusText: 'OK', size: body.length });
      expect(responseReceived.data).toBeNull();
      expect(responseReceived.dataBuffer).toBeNull();
      expect(responseReceived.storedRequestUid).toBe('run-1');
    });

    it('never reads the body file', async () => {
      const row = opened.statements.execute('get_runner_response', { request_uid: 'run-1' });

      await readRunnerExchange('run-1');

      expect(opened.files.read).not.toHaveBeenCalledWith(row.body_file_id);
    });

    it('still returns the request', async () => {
      expect((await readRunnerExchange('run-1')).requestSent).toEqual(REQUEST_SENT);
    });
  });

  describe('saving the body to a file', () => {
    let destination;

    beforeEach(() => {
      destination = path.join(filesDir, 'saved', 'response.json');
      fs.mkdirSync(path.dirname(destination));
    });

    it('copies a body that spilled to disk', async () => {
      const body = JSON.stringify({ items: Array.from({ length: 20 }, (_, i) => ({ id: i })) });
      await roundTrip({ responseReceived: responseWithBody(body) });

      await saveRunnerResponseBody('run-1', destination);

      expect(fs.readFileSync(destination, 'utf8')).toBe(body);
    });

    it('writes a body kept inline on the row', async () => {
      await roundTrip({ responseReceived: responseWithBody('{"ok":true}') });

      await saveRunnerResponseBody('run-1', destination);

      expect(fs.readFileSync(destination, 'utf8')).toBe('{"ok":true}');
    });

    it('writes an empty file for an empty body', async () => {
      await roundTrip({ responseReceived: { status: 204, headers: {}, data: '', dataBuffer: '' } });

      await saveRunnerResponseBody('run-1', destination);

      expect(fs.readFileSync(destination, 'utf8')).toBe('');
    });

    it('fails when only the request was stored', async () => {
      await storeRunnerExchange({ requestUid: 'run-1', eventData: EVENT_DATA, requestSent: REQUEST_SENT });

      await expect(saveRunnerResponseBody('run-1', destination)).rejects.toThrow('could not be found');
      expect(fs.existsSync(destination)).toBe(false);
    });

    it('fails when nothing was stored', async () => {
      await expect(saveRunnerResponseBody('missing', destination)).rejects.toThrow('could not be found');
    });
  });

  it('stores the body once rather than again inside the response json', async () => {
    const body = JSON.stringify({ items: Array.from({ length: 20 }, (_, i) => ({ id: i })) });

    await roundTrip({ responseReceived: responseWithBody(body) });

    const row = opened.statements.execute('get_runner_response', { request_uid: 'run-1' });
    const metadata = JSON.parse(Buffer.from(await opened.files.read(row.response_file_id)).toString());
    expect(metadata).not.toHaveProperty('data');
    expect(metadata).not.toHaveProperty('dataBuffer');
  });

  describe('timestamps', () => {
    const timestamps = () => opened.db._db
      .prepare('SELECT created_at, updated_at FROM runner_responses WHERE request_uid = ?')
      .get('run-1');

    it('stamps a new row in epoch seconds', async () => {
      const before = Math.floor(Date.now() / 1000);

      await storeRunnerExchange({ requestUid: 'run-1', eventData: EVENT_DATA, requestSent: REQUEST_SENT });

      const { created_at, updated_at } = timestamps();
      expect(created_at).toBeGreaterThanOrEqual(before);
      expect(updated_at).toBe(created_at);
    });

    it('keeps created_at and refreshes updated_at when the response is written', async () => {
      await storeRunnerExchange({ requestUid: 'run-1', eventData: EVENT_DATA, requestSent: REQUEST_SENT });
      opened.db._db.prepare('UPDATE runner_responses SET created_at = 1, updated_at = 1').run();

      await storeRunnerExchange({ requestUid: 'run-1', eventData: EVENT_DATA, responseReceived: responseWithBody('{"ok":true}') });

      const { created_at, updated_at } = timestamps();
      expect(created_at).toBe(1);
      expect(updated_at).toBeGreaterThan(1);
      expect((await readRunnerExchange('run-1')).requestSent).toEqual(REQUEST_SENT);
    });
  });

  describe('clearing a collection', () => {
    const fileRowCount = () => opened.db._db.prepare('SELECT COUNT(*) AS n FROM files').get().n;

    it('removes the rows and every file they point at', async () => {
      const body = JSON.stringify({ items: Array.from({ length: 20 }, (_, i) => ({ id: i })) });
      await roundTrip({ requestSent: REQUEST_SENT, responseReceived: responseWithBody(body) });
      expect(fileRowCount()).toBe(3);

      await clearRunnerResponses('col-1');

      expect(await readRunnerExchange('run-1')).toBeNull();
      expect(fileRowCount()).toBe(0);
      expect(fs.readdirSync(filesDir)).toHaveLength(0);
    });

    it('leaves another collection alone', async () => {
      await roundTrip({ responseReceived: responseWithBody('{"ok":true}') });
      await storeRunnerExchange({ requestUid: 'run-2', eventData: { collectionUid: 'col-2' }, responseReceived: responseWithBody('{"other":true}') });

      await clearRunnerResponses('col-1');

      expect((await readRunnerExchange('run-2')).responseReceived.data).toEqual({ other: true });
    });
  });
});
