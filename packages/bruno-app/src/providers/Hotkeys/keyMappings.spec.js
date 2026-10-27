const {
  getKeyBindingDisplayTextByOS,
  getKeyBindingForActionByOS
} = require('./keyMappings');

describe('keyMappings display helpers', () => {
  it('formats default shortcuts for display', () => {
    expect(getKeyBindingDisplayTextByOS('sendRequest', undefined, 'windows')).toBe('Ctrl + Enter');
    expect(getKeyBindingDisplayTextByOS('sendRequest', undefined, 'mac')).toBe('⌘ + ↩');
  });

  it('uses user keybinding overrides before formatting shortcuts', () => {
    const userKeyBindings = {
      sendRequest: {
        windows: 'ctrl+bind+shift+bind+r',
        mac: 'command+bind+shift+bind+r'
      }
    };

    expect(getKeyBindingForActionByOS('sendRequest', userKeyBindings, 'windows')).toBe('ctrl+bind+shift+bind+r');
    expect(getKeyBindingDisplayTextByOS('sendRequest', userKeyBindings, 'windows')).toBe('Ctrl + Shift + R');
    expect(getKeyBindingDisplayTextByOS('sendRequest', userKeyBindings, 'mac')).toBe('⇧ + ⌘ + R');
  });

  it('formats the sidebar focus shortcut for display', () => {
    expect(getKeyBindingDisplayTextByOS('focusActiveSidebarItem', undefined, 'windows')).toBe('Ctrl + Shift + E');
    expect(getKeyBindingDisplayTextByOS('focusActiveSidebarItem', undefined, 'mac')).toBe('⇧ + ⌘ + E');
  });

  it('does not define global arrow shortcuts for the sidebar', () => {
    expect(getKeyBindingForActionByOS('navigateSidebarUp', undefined, 'windows')).toBe('');
    expect(getKeyBindingForActionByOS('navigateSidebarDown', undefined, 'windows')).toBe('');
  });
});
