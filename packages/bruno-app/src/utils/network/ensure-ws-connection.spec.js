/**
 * @jest-environment jsdom
 */

import { ensureWsConnection } from './index';

describe('ensureWsConnection', () => {
  let invoke;

  beforeEach(() => {
    invoke = jest.fn();
    window.ipcRenderer = { invoke };
  });

  const item = { uid: 'req-1', request: { url: 'ws://localhost:9' }, settings: {} };
  const collection = { uid: 'col-1', runtimeVariables: {} };

  it('does not start a connection when already connecting', async () => {
    invoke.mockImplementation(async (channel) => {
      if (channel === 'renderer:ws:connection-status') {
        return { status: 'connecting' };
      }
      return { success: true };
    });

    await ensureWsConnection(item, collection, null, {});

    expect(invoke).toHaveBeenCalledWith('renderer:ws:connection-status', 'req-1');
    expect(invoke.mock.calls.some(([ch]) => ch === 'renderer:ws:start-connection')).toBe(false);
  });

  it('waits for disconnecting to finish then starts a fresh connection', async () => {
    let status = 'disconnecting';
    invoke.mockImplementation(async (channel) => {
      if (channel === 'renderer:ws:connection-status') {
        return { status };
      }
      if (channel === 'renderer:ws:close-connection') {
        status = 'disconnected';
        return { success: true };
      }
      if (channel === 'renderer:ws:start-connection') {
        status = 'connecting';
        return { success: true };
      }
      return { success: true };
    });

    await ensureWsConnection(item, collection, null, {});

    const channels = invoke.mock.calls.map(([ch]) => ch);
    expect(channels).toContain('renderer:ws:close-connection');
    expect(channels).toContain('renderer:ws:start-connection');
    expect(channels.indexOf('renderer:ws:close-connection')).toBeLessThan(
      channels.indexOf('renderer:ws:start-connection')
    );
  });
});
