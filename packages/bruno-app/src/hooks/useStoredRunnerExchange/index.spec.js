import { renderHook, waitFor } from '@testing-library/react';
import useStoredRunnerExchange from './index';

const CHANNEL = 'datastore:runner_responses:get_runner_response';

const REQUEST_SENT = { method: 'GET', url: 'https://example.com/userinfo', headers: {} };

const RESPONSE_RECEIVED = {
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  data: { ok: true },
  dataBuffer: Buffer.from('{"ok":true}').toString('base64'),
  size: 11,
  duration: 34
};

const STORED_EXCHANGE = { requestSent: REQUEST_SENT, responseReceived: RESPONSE_RECEIVED };

const settledItem = (overrides = {}) => ({
  uid: 'item-1',
  requestUid: 'run-1',
  status: 'completed',
  ...overrides
});

describe('useStoredRunnerExchange', () => {
  let invoke;
  let error;

  beforeEach(() => {
    invoke = jest.fn();
    window.ipcRenderer = { invoke };
    error = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    error.mockRestore();
    delete window.ipcRenderer;
  });

  describe('when the exchange is stored', () => {
    beforeEach(() => {
      invoke.mockResolvedValue(STORED_EXCHANGE);
    });

    it('returns the stored payloads', async () => {
      const { result } = renderHook(() => useStoredRunnerExchange(settledItem()));

      await waitFor(() => expect(result.current.responseReceived).toEqual(RESPONSE_RECEIVED));
      expect(result.current.requestSent).toEqual(REQUEST_SENT);
    });

    it('prefers the stored payload over the reduced one on the item', async () => {
      const item = settledItem({ responseReceived: { status: 200, statusText: 'OK' } });
      const { result } = renderHook(() => useStoredRunnerExchange(item));

      await waitFor(() => expect(result.current.responseReceived).toEqual(RESPONSE_RECEIVED));
    });

    it('reads it in a single call', async () => {
      const { result } = renderHook(() => useStoredRunnerExchange(settledItem()));

      await waitFor(() => expect(result.current.responseReceived).toEqual(RESPONSE_RECEIVED));
      expect(invoke).toHaveBeenCalledTimes(1);
    });
  });

  describe('when no row exists', () => {
    beforeEach(() => {
      invoke.mockResolvedValue(null);
    });

    it('falls back to the payloads the runner event put on the item', async () => {
      const item = settledItem({ requestSent: REQUEST_SENT, responseReceived: RESPONSE_RECEIVED });
      const { result } = renderHook(() => useStoredRunnerExchange(item));

      await waitFor(() => expect(invoke).toHaveBeenCalled());
      expect(result.current.requestSent).toEqual(REQUEST_SENT);
      expect(result.current.responseReceived).toEqual(RESPONSE_RECEIVED);
    });

    it('returns nulls when the item carries no payload either', async () => {
      const { result } = renderHook(() => useStoredRunnerExchange(settledItem()));

      await waitFor(() => expect(invoke).toHaveBeenCalled());
      expect(result.current.requestSent).toBeUndefined();
      expect(result.current.responseReceived).toBeUndefined();
    });
  });

  it('falls back to the item payload when the read fails', async () => {
    invoke.mockRejectedValue(new Error('The database is unavailable'));
    const item = settledItem({ responseReceived: RESPONSE_RECEIVED });
    const { result } = renderHook(() => useStoredRunnerExchange(item));

    await waitFor(() => expect(error).toHaveBeenCalled());
    expect(result.current.responseReceived).toEqual(RESPONSE_RECEIVED);
  });

  it('does not read until the item settles', () => {
    renderHook(() => useStoredRunnerExchange(settledItem({ status: 'running' })));

    expect(invoke).not.toHaveBeenCalled();
  });

  it('does not read without a request uid', () => {
    renderHook(() => useStoredRunnerExchange(settledItem({ requestUid: undefined })));

    expect(invoke).not.toHaveBeenCalled();
  });

  it.each(['completed', 'error'])('reads by request uid once the item is %s', async (status) => {
    invoke.mockResolvedValue(null);

    renderHook(() => useStoredRunnerExchange(settledItem({ status })));

    await waitFor(() => expect(invoke).toHaveBeenCalledWith(CHANNEL, { request_uid: 'run-1' }));
  });

  it('reads when a running item settles', async () => {
    invoke.mockResolvedValue(STORED_EXCHANGE);
    const { result, rerender } = renderHook(({ item }) => useStoredRunnerExchange(item), {
      initialProps: { item: settledItem({ status: 'running' }) }
    });
    expect(invoke).not.toHaveBeenCalled();

    rerender({ item: settledItem({ status: 'completed' }) });

    await waitFor(() => expect(result.current.responseReceived).toEqual(RESPONSE_RECEIVED));
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('never shows the exchange of a previous request while the next one loads', async () => {
    let resolveNext;
    invoke
      .mockResolvedValueOnce(STORED_EXCHANGE)
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveNext = resolve;
      }));
    const { result, rerender } = renderHook(({ item }) => useStoredRunnerExchange(item), {
      initialProps: { item: settledItem() }
    });
    await waitFor(() => expect(result.current.responseReceived).toEqual(RESPONSE_RECEIVED));

    rerender({ item: settledItem({ requestUid: 'run-2' }) });

    expect(result.current.requestSent).toBeUndefined();
    expect(result.current.responseReceived).toBeUndefined();
    resolveNext(null);
    await waitFor(() => expect(invoke).toHaveBeenLastCalledWith(CHANNEL, { request_uid: 'run-2' }));
  });
});
