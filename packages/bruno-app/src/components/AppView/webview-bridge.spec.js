import { act, renderHook } from '@testing-library/react';
import { useAppDocumentUrl, useAppWebview } from './webview-bridge';

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
describe('useAppWebview', () => {
  it('delivers replies after an iframe starts loading', () => {
    const webview = document.createElement('webview');
    webview.executeJavaScript = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useAppWebview(() => {}));

    act(() => {
      result.current.webviewRef(webview);
    });

    act(() => {
      webview.dispatchEvent(new Event('dom-ready'));
    });

    const navigation = Object.assign(new Event('did-start-navigation'), {
      isMainFrame: false,
      isInPlace: false
    });

    act(() => {
      webview.dispatchEvent(navigation);
      webview.dispatchEvent(new Event('did-start-loading'));
    });

    act(() => {
      result.current.pushToGuest({
        type: 'reply',
        replyId: 'iframe-check',
        result: ['example']
      });
    });

    expect(webview.executeJavaScript).toHaveBeenCalledTimes(1);
    expect(webview.executeJavaScript).toHaveBeenCalledWith(
      expect.stringContaining('"replyId":"iframe-check"')
    );
  });
  it('queues replies during main-document navigation until dom-ready', () => {
    const webview = document.createElement('webview');
    webview.executeJavaScript = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useAppWebview(() => {}));

    act(() => {
      result.current.webviewRef(webview);
    });

    act(() => {
      webview.dispatchEvent(new Event('dom-ready'));
    });

    act(() => {
      const navigation = Object.assign(new Event('did-start-navigation'), {
        isMainFrame: true,
        isInPlace: false
      });

      webview.dispatchEvent(navigation);
    });

    act(() => {
      result.current.pushToGuest({
        type: 'reply',
        replyId: 'reload-check'
      });
    });

    expect(webview.executeJavaScript).not.toHaveBeenCalled();

    act(() => {
      webview.dispatchEvent(new Event('dom-ready'));
    });

    expect(webview.executeJavaScript).toHaveBeenCalledTimes(1);
    expect(webview.executeJavaScript).toHaveBeenCalledWith(
      expect.stringContaining('"replyId":"reload-check"')
    );
  });
});
