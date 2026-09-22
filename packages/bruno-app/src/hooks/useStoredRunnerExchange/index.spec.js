import { renderHook } from '@testing-library/react';
import { useSqliteQuery, useSqliteFileBytes, useSqliteFileText } from '@usebruno/sqlite/web';
import useStoredRunnerExchange from './index';

jest.mock('@usebruno/sqlite/web', () => ({
  useSqliteQuery: jest.fn(),
  useSqliteFileText: jest.fn(),
  useSqliteFileBytes: jest.fn()
}));

const REQUEST_SENT = { method: 'GET', url: 'https://example.com/userinfo', headers: {} };

const RESPONSE_RECEIVED = {
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  data: { ok: true },
  size: 12,
  duration: 34
};

const BODY = Buffer.from('{"ok":true}');

const encode = (value) => new TextEncoder().encode(JSON.stringify(value));

const settledItem = (overrides = {}) => ({
  uid: 'item-1',
  requestUid: 'run-1',
  status: 'completed',
  ...overrides
});

const inlineRow = (overrides = {}) => ({
  request_file_id: 1,
  request_data: encode(REQUEST_SENT),
  response_file_id: 2,
  response_data: encode(RESPONSE_RECEIVED),
  body_file_id: 3,
  body_data: BODY,
  ...overrides
});

describe('useStoredRunnerExchange', () => {
  beforeEach(() => {
    useSqliteQuery.mockReset();
    useSqliteFileText.mockReset().mockReturnValue({ data: undefined });
    useSqliteFileBytes.mockReset().mockReturnValue({ data: undefined });
  });

  describe('when the payloads are inline on the row', () => {
    beforeEach(() => {
      useSqliteQuery.mockReturnValue({ data: inlineRow() });
    });

    it('decodes the stored request and response', () => {
      const { result } = renderHook(() => useStoredRunnerExchange(settledItem()));

      expect(result.current.requestSent).toEqual(REQUEST_SENT);
      expect(result.current.responseReceived).toMatchObject(RESPONSE_RECEIVED);
    });

    it('reattaches the body as base64', () => {
      const { result } = renderHook(() => useStoredRunnerExchange(settledItem()));

      expect(result.current.responseReceived.dataBuffer).toBe(BODY.toString('base64'));
    });

    it('reads no files, because the row carries every payload', () => {
      renderHook(() => useStoredRunnerExchange(settledItem()));

      expect(useSqliteFileText).toHaveBeenCalledWith(null, undefined, expect.objectContaining({ gcTime: 0 }));
      expect(useSqliteFileBytes).toHaveBeenCalledWith(null, undefined, expect.objectContaining({ gcTime: 0 }));
    });

    it('keeps the row out of the query cache once the pane closes', () => {
      renderHook(() => useStoredRunnerExchange(settledItem()));

      expect(useSqliteQuery).toHaveBeenCalledWith(
        'get_runner_response',
        { request_uid: 'run-1' },
        expect.objectContaining({ gcTime: 0 })
      );
    });

    it('prefers the stored payload over the reduced one on the item', () => {
      const item = settledItem({ responseReceived: { status: 200, statusText: 'OK' } });
      const { result } = renderHook(() => useStoredRunnerExchange(item));

      expect(result.current.responseReceived).toMatchObject(RESPONSE_RECEIVED);
    });
  });

  describe('when a payload spilled to disk', () => {
    beforeEach(() => {
      useSqliteQuery.mockReturnValue({ data: inlineRow({ response_data: null, body_data: null }) });
    });

    it('reads only the files the row does not carry', () => {
      renderHook(() => useStoredRunnerExchange(settledItem()));

      expect(useSqliteFileText).toHaveBeenNthCalledWith(1, null, undefined, expect.anything());
      expect(useSqliteFileText).toHaveBeenNthCalledWith(2, 2, undefined, expect.anything());
      expect(useSqliteFileBytes).toHaveBeenCalledWith(3, undefined, expect.anything());
    });

    it('uses what those reads return', () => {
      useSqliteFileText.mockReturnValueOnce({ data: undefined });
      useSqliteFileText.mockReturnValueOnce({ data: JSON.stringify(RESPONSE_RECEIVED) });
      useSqliteFileBytes.mockReturnValue({ data: BODY });

      const { result } = renderHook(() => useStoredRunnerExchange(settledItem()));

      expect(result.current.responseReceived).toMatchObject(RESPONSE_RECEIVED);
      expect(result.current.responseReceived.dataBuffer).toBe(BODY.toString('base64'));
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
      expect.objectContaining({ enabled: false })
    );
  });

  it('reads once the item has settled', () => {
    useSqliteQuery.mockReturnValue({ data: undefined });

    renderHook(() => useStoredRunnerExchange(settledItem({ status: 'error' })));

    expect(useSqliteQuery).toHaveBeenCalledWith(
      'get_runner_response',
      { request_uid: 'run-1' },
      expect.objectContaining({ enabled: true })
    );
  });
});
