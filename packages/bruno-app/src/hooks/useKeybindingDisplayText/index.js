import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { getKeyBindingDisplayTextByOS, getKeyBindingDisplayOS } from 'providers/Hotkeys/keyMappings';

const MENU_SHORTCUT_SEPARATORS = { mac: ' ', windows: '+', linux: '+' };

/**
 * Returns a function that maps an action ID (e.g. 'cloneItem') to its shortcut text for the current OS.
 * The text is '' while keybindings are disabled, so menus never show a shortcut that won't fire.
 */
function useKeybindingDisplayText() {
  const userKeyBindings = useSelector((state) => state.app.preferences?.keyBindings);
  const keybindingsEnabled = useSelector((state) => state.app.preferences?.keybindingsEnabled !== false);
  const os = getKeyBindingDisplayOS();

  return useCallback((action) => (
    keybindingsEnabled ? getKeyBindingDisplayTextByOS(action, userKeyBindings, os, MENU_SHORTCUT_SEPARATORS[os]) : ''
  ), [keybindingsEnabled, userKeyBindings, os]);
}

export default useKeybindingDisplayText;
