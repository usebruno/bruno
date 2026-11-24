import { act, renderHook } from '@testing-library/react';
import { useAppDocumentUrl } from './webview-bridge';

describe('useAppDocumentUrl', () => {
  let resolveRegistration;

  beforeEach(() => {
    window.ipcRenderer = {
      invoke: jest.fn((channel, { ownerKey }) => {
        if (channel === 'renderer:register-app-document') {
          return new Promise((resolve) => {
            resolveRegistration = () => resolve(`bruno-app://${ownerKey}`);
          });
        }
        return Promise.resolve();
      })
    };
  });

  it('does not expose the previous owner URL while registering a new document', async () => {
    const renderedValues = [];
    const { rerender } = renderHook(
      ({ ownerKey }) => {
        const value = useAppDocumentUrl(ownerKey, '', '<p>App</p>');
        renderedValues.push(value);
        return value;
      },
      { initialProps: { ownerKey: 'request:one' } }
    );

    await act(async () => {
      resolveRegistration();
    });
    renderedValues.length = 0;

    rerender({ ownerKey: 'request:two' });

    expect(renderedValues[0]).toEqual({ url: null, error: null });
  });
});
