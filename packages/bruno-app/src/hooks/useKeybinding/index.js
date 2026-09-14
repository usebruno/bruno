import { useEffect, useRef } from 'react';
import Mousetrap from 'mousetrap';
import { useSelector } from 'react-redux';
import { getKeyBindingsForActionAllOS } from 'providers/Hotkeys/keyMappings';

/**
 * Hook for binding a customizable keyboard shortcut to a handler.
 * Reads merged keybindings (defaults + user overrides) and binds via Mousetrap.
 *
 * Use this for COMPONENT-LEVEL shortcuts (e.g. clone, rename) where the handler
 * lives inside the component, not in HotkeysProvider.
 *
 * @param {string} action - The action ID from KEY_BINDING_SECTIONS (e.g. 'cloneItem')
 * @param {Function} handler - Callback to run when the shortcut is pressed. Should return false to stop bubbling.
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] - Whether the binding is active. Pass false to skip binding.
 * @param {Array} [options.deps=[]] - Additional dependencies that should trigger rebinding.
 */
function useKeybinding(action, handler, { enabled = true, deps = [] } = {}) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const userKeyBindings = useSelector((state) => state.app.preferences?.keyBindings);
  const keybindingsEnabled = useSelector((state) => state.app.preferences?.keybindingsEnabled !== false);

  useEffect(() => {
    if (!enabled || !keybindingsEnabled) return;

    const combos = getKeyBindingsForActionAllOS(action, userKeyBindings);
    if (!combos) return;

    Mousetrap.bind(combos, (e) => {
      return handlerRef.current(e);
    });

    return () => {
      Mousetrap.unbind(combos);
    };
  }, [action, enabled, keybindingsEnabled, userKeyBindings, ...deps]);
}

export default useKeybinding;
