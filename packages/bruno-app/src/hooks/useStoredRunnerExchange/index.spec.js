import { renderHook } from '@testing-library/react';
import { useSqliteQuery } from '@usebruno/sqlite/web';
import useStoredRunnerExchange from './index';

jest.mock('@usebruno/sqlite/web', () => ({ useSqliteQuery: jest.fn() }));

const REQUEST_SENT = { method: 'GET', url: 'https://example.com/userinfo', headers: {} };

const RESPONSE_RECEIVED = {
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  data: { ok: true },
  size: 12,
  duration: 34
};

const settledItem = (overrides = {}) => ({
  uid: 'item-1',
  requestUid: 'run-1',
  status: 'completed',
  ...overrides
});

describe('useStoredRunnerExchange', () => {
  beforeEach(() => {
    useSqliteQuery.mockReset();
  });

  describe('when the row is in sqlite', () => {
    beforeEach(() => {
      useSqliteQuery.mockReturnValue({
        data: { request: JSON.stringify(REQUEST_SENT), response: JSON.stringify(RESPONSE_RECEIVED) }
      });
    });

    it('returns the stored payloads', () => {
      const { result } = renderHook(() => useStoredRunnerExchange(settledItem()));

      expect(result.current.requestSent).toEqual(REQUEST_SENT);
      expect(result.current.responseReceived).toEqual(RESPONSE_RECEIVED);
    });

    it('prefers the stored payload over the reduced one on the item', () => {
      const item = settledItem({ responseReceived: { status: 200, statusText: 'OK' } });
      const { result } = renderHook(() => useStoredRunnerExchange(item));

      expect(result.current.responseReceived).toEqual(RESPONSE_RECEIVED);
    });
  });

  describe('when the write failed and no row exists', () => {
    beforeEach(() => {
      useSqliteQuery.mockReturnValue({ data: undefined });
    });

    it('falls back to the payloads the runner event put on the item', () => {
      const item = settledItem({ requestSent: REQUEST_SENT, responseReceived: RESPONSE_RECEIVED });
      const { result } = renderHook(() => useStoredRunnerExchange(item));

      expect(result.current.requestSent).toEqual(REQUEST_SENT);
      expect(result.current.responseReceived).toEqual(RESPONSE_RECEIVED);
    });

    it('returns nulls when the item carries no payload either', () => {
      const { result } = renderHook(() => useStoredRunnerExchange(settledItem()));

      expect(result.current.requestSent).toBeNull();
      expect(result.current.responseReceived).toBeNull();
    });
  });

  it('does not read until the item settles', () => {
    useSqliteQuery.mockReturnValue({ data: undefined });

    renderHook(() => useStoredRunnerExchange(settledItem({ status: 'running' })));

    expect(useSqliteQuery).toHaveBeenCalledWith(
      'get_runner_response',
      { request_uid: 'run-1' },
      { enabled: false }
    );
  });

  it('reads once the item has settled', () => {
    useSqliteQuery.mockReturnValue({ data: undefined });

    renderHook(() => useStoredRunnerExchange(settledItem({ status: 'error' })));

    expect(useSqliteQuery).toHaveBeenCalledWith(
      'get_runner_response',
      { request_uid: 'run-1' },
      { enabled: true }
    );
  });
});
