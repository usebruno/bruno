jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  app: {
    on: jest.fn(),
    getPath: jest.fn(() => require('node:os').tmpdir()),
    getVersion: jest.fn(() => '1.0.0')
  }
}));

jest.mock('../sqlite', () => ({ getStatements: jest.fn() }));

const EVENT_DATA = { collectionUid: 'col-1', itemUid: 'item-1' };

const REQUEST_SENT = { method: 'GET', url: 'https://example.com/userinfo', headers: {} };

const RESPONSE_RECEIVED = {
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  data: { ok: true },
  size: 12,
  duration: 34
};

describe('runner-exchange', () => {
  let getStatements;
  let createRunnerExchangeEmitters;
  let mainWindow;
  let error;

  const lastEvent = () => mainWindow.webContents.send.mock.calls.at(-1)[1];

  beforeEach(() => {
    jest.resetModules();
    ({ getStatements } = require('../sqlite'));
    ({ createRunnerExchangeEmitters } = require('./runner-exchange'));
    mainWindow = { webContents: { send: jest.fn() } };
    error = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    error.mockRestore();
  });

  describe('when the exchange is stored', () => {
    let execute;

    beforeEach(() => {
      execute = jest.fn();
      getStatements.mockReturnValue({ execute });
    });

    it('writes the request payload and keeps it out of the event', () => {
      const { sendRunnerRequestSent } = createRunnerExchangeEmitters(mainWindow);

      sendRunnerRequestSent({ requestUid: 'run-1', requestSent: REQUEST_SENT, eventData: EVENT_DATA });

      expect(execute).toHaveBeenCalledWith('upsert_runner_response', {
        request_uid: 'run-1',
        collection_uid: 'col-1',
        request: JSON.stringify(REQUEST_SENT),
        response: null
      });
      expect(lastEvent()).toEqual({ type: 'request-sent', ...EVENT_DATA });
    });

    it('reduces the response on the event to what the runner list renders', () => {
      const { sendRunnerResponseReceived } = createRunnerExchangeEmitters(mainWindow);

      sendRunnerResponseReceived({ requestUid: 'run-1', responseReceived: RESPONSE_RECEIVED, eventData: EVENT_DATA });

      expect(execute).toHaveBeenCalledWith('upsert_runner_response', {
        request_uid: 'run-1',
        collection_uid: 'col-1',
        request: null,
        response: JSON.stringify(RESPONSE_RECEIVED)
      });
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
    });

    it('carries the full request payload on the event instead', () => {
      const { sendRunnerRequestSent } = createRunnerExchangeEmitters(mainWindow);

      sendRunnerRequestSent({ requestUid: 'run-1', requestSent: REQUEST_SENT, eventData: EVENT_DATA });

      expect(lastEvent().requestSent).toEqual(REQUEST_SENT);
      expect(error).toHaveBeenCalled();
    });

    it('carries the full response payload on the event instead', () => {
      const { sendRunnerResponseReceived } = createRunnerExchangeEmitters(mainWindow);

      sendRunnerResponseReceived({ requestUid: 'run-1', responseReceived: RESPONSE_RECEIVED, eventData: EVENT_DATA });

      expect(lastEvent().responseReceived).toEqual(RESPONSE_RECEIVED);
      expect(error).toHaveBeenCalled();
    });
  });

  describe('when the database is unavailable', () => {
    beforeEach(() => {
      getStatements.mockReturnValue(null);
    });

    it('carries the full request payload on the event instead', () => {
      const { sendRunnerRequestSent } = createRunnerExchangeEmitters(mainWindow);

      sendRunnerRequestSent({ requestUid: 'run-1', requestSent: REQUEST_SENT, eventData: EVENT_DATA });

      expect(lastEvent().requestSent).toEqual(REQUEST_SENT);
    });

    it('carries the full response payload on the event instead', () => {
      const { sendRunnerResponseReceived } = createRunnerExchangeEmitters(mainWindow);

      sendRunnerResponseReceived({ requestUid: 'run-1', responseReceived: RESPONSE_RECEIVED, eventData: EVENT_DATA });

      expect(lastEvent().responseReceived).toEqual(RESPONSE_RECEIVED);
    });
  });

  it('keeps the error alongside the response payload', () => {
    getStatements.mockReturnValue({ execute: jest.fn() });
    const { sendRunnerResponseReceived } = createRunnerExchangeEmitters(mainWindow);

    sendRunnerResponseReceived({
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
