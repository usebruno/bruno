import { buildSearchKeyBindings } from './searchKeyBindings';

function setup({ selection = 'timeout', readOnly = false, searchBarVisible = false } = {}) {
  const handle = {
    setSearch: jest.fn(),
    focusAtCursor: jest.fn(),
    openReplace: jest.fn(),
    close: jest.fn()
  };
  const setState = jest.fn((update, cb) => cb && cb());
  const bindings = buildSearchKeyBindings({
    setState,
    searchBarRef: { current: handle },
    isSearchBarVisible: () => searchBarVisible,
    isReadOnly: () => readOnly
  });
  const cm = { getSelection: () => selection, getCursor: () => ({ line: 3, ch: 7 }) };

  return { bindings, handle, setState, cm };
}

describe('buildSearchKeyBindings', () => {
  it('maps the Windows/Linux keys to the same handlers as the Mac ones', () => {
    const { bindings } = setup();
    expect(bindings['Ctrl-F']).toBe(bindings['Cmd-F']);
    expect(bindings['Ctrl-H']).toBe(bindings['Cmd-Alt-F']);
    expect(bindings['Cmd-F']).not.toBe(bindings['Ctrl-H']);
  });

  it('disables Cmd-H so macOS keeps its system hide-window shortcut', () => {
    expect(setup().bindings['Cmd-H']).toBe(false);
  });

  it.each(['Cmd-Alt-F', 'Ctrl-H'])('%s is a no-op on a read-only editor', (key) => {
    const { bindings, handle, setState, cm } = setup({ readOnly: true });
    bindings[key](cm);

    expect(setState).not.toHaveBeenCalled();
    expect(handle.setSearch).not.toHaveBeenCalled();
    expect(handle.openReplace).not.toHaveBeenCalled();
  });

  it('still opens the search bar on a read-only editor', () => {
    const { bindings, handle, cm } = setup({ readOnly: true });
    bindings['Cmd-F'](cm);

    expect(handle.setSearch).toHaveBeenCalledWith('timeout', { line: 3, ch: 7 });
    expect(handle.openReplace).not.toHaveBeenCalled();
  });

  it('leaves Esc to other handlers when the search bar is hidden', () => {
    const { bindings, handle } = setup({ searchBarVisible: false });
    bindings['Esc']();
    expect(handle.close).not.toHaveBeenCalled();
  });
});
