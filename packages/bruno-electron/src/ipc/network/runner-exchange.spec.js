jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  app: {
    on: jest.fn(),
    getPath: jest.fn(() => require('node:os').tmpdir()),
    getVersion: jest.fn(() => '1.0.0')
  }
}));

jest.mock('../../services/sqlite', () => ({ getStatements: jest.fn(), getFiles: jest.fn() }));

const EVENT_DATA = { collectionUid: 'col-1', itemUid: 'item-1' };

const REQUEST_SENT = { method: 'GET', url: 'https://example.com/userinfo', headers: {} };

const BODY = Buffer.from('{"ok":true}');

const RESPONSE_RECEIVED = {
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  data: { ok: true },
  dataBuffer: BODY.toString('base64'),
  size: 12,
  duration: 34
};

describe('runner-exchange', () => {
  let getStatements;
  let getFiles;
  let createRunnerExchangeEmitters;
  let mainWindow;
  let error;

  const lastEvent = () => mainWindow.webContents.send.mock.calls.at(-1)[1];

  const fileStoreReturning = (ids) => {
    const queue = [...ids];
    return { write: jest.fn(async () => ({ id: queue.shift(), inline: true })) };
  };

  beforeEach(() => {
    jest.resetModules();
    ({ getStatements, getFiles } = require('../../services/sqlite'));
    ({ createRunnerExchangeEmitters } = require('./runner-exchange'));
    mainWindow = { webContents: { send: jest.fn() } };
    error = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    error.mockRestore();
  });

  describe('when the exchange is stored', () => {
    let execute;
    let files;

    beforeEach(() => {
      execute = jest.fn();
      getStatements.mockReturnValue({ execute });
      files = fileStoreReturning([11, 22, 33]);
      getFiles.mockReturnValue(files);
    });

    it('writes the request payload and keeps it out of the event', async () => {
      const { sendRunnerRequestSent } = createRunnerExchangeEmitters(mainWindow);

      await sendRunnerRequestSent({ requestUid: 'run-1', requestSent: REQUEST_SENT, eventData: EVENT_DATA });

      expect(files.write).toHaveBeenCalledWith(JSON.stringify(REQUEST_SENT), { contentType: 'application/json' });
      expect(execute).toHaveBeenCalledWith('upsert_runner_response', {
        request_uid: 'run-1',
        collection_uid: 'col-1',
        request_file_id: 11,
        response_file_id: null,
        body_file_id: null
      });
      expect(lastEvent()).toEqual({ type: 'request-sent', ...EVENT_DATA });
    });

    it('stores the response body as its own file with the response content type', async () => {
      const { sendRunnerResponseReceived } = createRunnerExchangeEmitters(mainWindow);

      await sendRunnerResponseReceived({
        requestUid: 'run-1',
        responseReceived: RESPONSE_RECEIVED,
        eventData: EVENT_DATA
      });

      const [body, response] = files.write.mock.calls;
      expect(body[0]).toEqual(BODY);
      expect(body[1]).toEqual({ contentType: 'application/json' });

      const { dataBuffer, data, ...metadata } = RESPONSE_RECEIVED;
      expect(JSON.parse(response[0])).toEqual({ ...metadata, disableParsingResponseJson: false });

      expect(execute).toHaveBeenCalledWith('upsert_runner_response', {
        request_uid: 'run-1',
        collection_uid: 'col-1',
        request_file_id: null,
        response_file_id: 22,
        body_file_id: 11
      });
    });

    it('stores no body row when the response carries none', async () => {
      const { dataBuffer, ...withoutBody } = RESPONSE_RECEIVED;
      const { sendRunnerResponseReceived } = createRunnerExchangeEmitters(mainWindow);

      await sendRunnerResponseReceived({
        requestUid: 'run-1',
        responseReceived: withoutBody,
        eventData: EVENT_DATA
      });

      expect(files.write).toHaveBeenCalledTimes(1);
      expect(execute).toHaveBeenCalledWith(
        'upsert_runner_response',
        expect.objectContaining({ body_file_id: null, response_file_id: 11 })
      );
    });

    it('records that json parsing was disabled so the read can decode the body the same way', async () => {
      const { sendRunnerResponseReceived } = createRunnerExchangeEmitters(mainWindow);

      await sendRunnerResponseReceived({
        requestUid: 'run-1',
        responseReceived: RESPONSE_RECEIVED,
        disableParsingResponseJson: true,
        eventData: EVENT_DATA
      });

      const [, response] = files.write.mock.calls;
      expect(JSON.parse(response[0])).toMatchObject({ disableParsingResponseJson: true });
      expect(JSON.parse(response[0])).not.toHaveProperty('data');
    });

    it('reduces the response on the event to what the runner list renders', async () => {
      const { sendRunnerResponseReceived } = createRunnerExchangeEmitters(mainWindow);

      await sendRunnerResponseReceived({ requestUid: 'run-1', responseReceived: RESPONSE_RECEIVED, eventData: EVENT_DATA });

      expect(lastEvent().responseReceived).toEqual({ status: 200, statusText: 'OK' });
    });
  });

  describe('when the upsert throws', () => {
    beforeEach(() => {
      getStatements.mockReturnValue({
        execute: jest.fn(() => {
          throw new Error('database or disk is full');
        })
      });
      getFiles.mockReturnValue(fileStoreReturning([1, 2, 3]));
    });

    it('carries the full request payload on the event instead', async () => {
      const { sendRunnerRequestSent } = createRunnerExchangeEmitters(mainWindow);

      await sendRunnerRequestSent({ requestUid: 'run-1', requestSent: REQUEST_SENT, eventData: EVENT_DATA });

      expect(lastEvent().requestSent).toEqual(REQUEST_SENT);
      expect(error).toHaveBeenCalled();
    });

    it('carries the full response payload on the event instead', async () => {
      const { sendRunnerResponseReceived } = createRunnerExchangeEmitters(mainWindow);

      await sendRunnerResponseReceived({ requestUid: 'run-1', responseReceived: RESPONSE_RECEIVED, eventData: EVENT_DATA });

      expect(lastEvent().responseReceived).toEqual(RESPONSE_RECEIVED);
      expect(error).toHaveBeenCalled();
    });
  });

  describe('when the database is unavailable', () => {
    let warn;

    beforeEach(() => {
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const actual = jest.requireActual('../../services/sqlite');
      getStatements.mockImplementation(actual.getStatements);
      getFiles.mockImplementation(actual.getFiles);
    });

    afterEach(() => {
      warn.mockRestore();
    });

    it('carries the full request payload on the event instead', async () => {
      const { sendRunnerRequestSent } = createRunnerExchangeEmitters(mainWindow);

      await sendRunnerRequestSent({ requestUid: 'run-1', requestSent: REQUEST_SENT, eventData: EVENT_DATA });

      expect(lastEvent().requestSent).toEqual(REQUEST_SENT);
      expect(warn).toHaveBeenCalledWith('[sqlite] the database is unavailable, skipped a file write');
    });

    it('carries the full response payload on the event instead', async () => {
      const { sendRunnerResponseReceived } = createRunnerExchangeEmitters(mainWindow);

      await sendRunnerResponseReceived({ requestUid: 'run-1', responseReceived: RESPONSE_RECEIVED, eventData: EVENT_DATA });

      expect(lastEvent().responseReceived).toEqual(RESPONSE_RECEIVED);
    });
  });

  it('keeps the error alongside the response payload', async () => {
    getStatements.mockReturnValue({ execute: jest.fn() });
    getFiles.mockReturnValue(fileStoreReturning([1, 2]));
    const { sendRunnerResponseReceived } = createRunnerExchangeEmitters(mainWindow);

    await sendRunnerResponseReceived({
      requestUid: 'run-1',
      responseReceived: RESPONSE_RECEIVED,
      error: 'socket hang up',
      eventData: EVENT_DATA
    });

    expect(lastEvent()).toMatchObject({
      type: 'response-received',
      error: 'socket hang up',
      responseReceived: { status: 200, statusText: 'OK' }
    });
  });
});
