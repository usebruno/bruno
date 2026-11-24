jest.mock('utils/common/platform', () => ({
  isMacOS: () => false,
  isLinuxOS: () => false
}));

const {
  getKeyBindingDisplayTextByOS,
  getKeyBindingForActionByOS,
  getKeyBindingsForActionAllOS
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
});

describe('default combos yielding to user remaps', () => {
  it('binds the default combo when no user remap collides', () => {
    expect(getKeyBindingsForActionAllOS('saveAllWorkspace', {})).toEqual(['alt+shift+s']);
  });

  it('does not bind a default combo the user already assigned to another action', () => {
    const userKeyBindings = {
      closeTab: { windows: 'alt+bind+shift+bind+s' }
    };

    expect(getKeyBindingsForActionAllOS('saveAllWorkspace', userKeyBindings)).toBeNull();
    expect(getKeyBindingsForActionAllOS('closeTab', userKeyBindings)).toEqual(['alt+shift+s']);
  });

  it('detects the collision regardless of stored modifier order', () => {
    const userKeyBindings = {
      closeTab: { windows: 'shift+bind+alt+bind+s' }
    };

    expect(getKeyBindingsForActionAllOS('saveAllWorkspace', userKeyBindings)).toBeNull();
  });

  it('keeps an action the user remapped even if its default collides elsewhere', () => {
    const userKeyBindings = {
      saveAllWorkspace: { windows: 'alt+bind+shift+bind+a' },
      closeTab: { windows: 'alt+bind+shift+bind+s' }
    };

    expect(getKeyBindingsForActionAllOS('saveAllWorkspace', userKeyBindings)).toEqual(['alt+shift+a']);
  });

  it('ignores stored bindings for actions that no longer exist', () => {
    const userKeyBindings = {
      removedAction: { windows: 'alt+bind+shift+bind+s' }
    };

    expect(getKeyBindingsForActionAllOS('saveAllWorkspace', userKeyBindings)).toEqual(['alt+shift+s']);
  });
});
