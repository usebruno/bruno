import { fireEvent, renderHook } from '@testing-library/react';
import { useSelector } from 'react-redux';
import { getKeyBindingOS } from 'providers/Hotkeys/keyMappings';
import useKeybinding from './index';

jest.mock('react-redux', () => ({
  useSelector: jest.fn()
}));

const openCollectionShortcut = {
  key: 'o',
  code: 'KeyO',
  keyCode: 79,
  which: 79,
  shiftKey: true,
  ...(getKeyBindingOS() === 'mac' ? { metaKey: true } : { ctrlKey: true })
};

describe('useKeybinding with a scope', () => {
  let scope;
  let input;

  beforeEach(() => {
    useSelector.mockImplementation((selector) => selector({ app: { preferences: {} } }));
    scope = document.createElement('div');
    input = document.createElement('input');
    scope.appendChild(input);
    document.body.appendChild(scope);
  });

  afterEach(() => {
    scope.remove();
  });

  it('runs the handler for a key press in a text field inside the scope element', () => {
    const handler = jest.fn();
    const scopeRef = { current: scope };
    renderHook(() => useKeybinding('openCollection', handler, { scopeRef }));

    fireEvent.keyDown(input, openCollectionShortcut);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores a key press outside the scope element', () => {
    const handler = jest.fn();
    const scopeRef = { current: scope };
    renderHook(() => useKeybinding('openCollection', handler, { scopeRef }));

    fireEvent.keyDown(document.body, openCollectionShortcut);

    expect(handler).not.toHaveBeenCalled();
  });

  it('binds nothing while the scope ref has no element', () => {
    const handler = jest.fn();
    const scopeRef = { current: null };
    renderHook(() => useKeybinding('openCollection', handler, { scopeRef }));

    fireEvent.keyDown(document.body, openCollectionShortcut);
    fireEvent.keyDown(input, openCollectionShortcut);

    expect(handler).not.toHaveBeenCalled();
  });

  it('stops running the handler once unmounted', () => {
    const handler = jest.fn();
    const scopeRef = { current: scope };
    const { unmount } = renderHook(() => useKeybinding('openCollection', handler, { scopeRef }));

    unmount();
    fireEvent.keyDown(input, openCollectionShortcut);

    expect(handler).not.toHaveBeenCalled();
  });
});
