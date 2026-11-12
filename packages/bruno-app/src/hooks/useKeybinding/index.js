import { useEffect, useRef } from 'react';
import Mousetrap from 'mousetrap';
import { useSelector } from 'react-redux';
import { getKeyBindingsForActionAllOS } from 'providers/Hotkeys/keyMappings';

// Mousetrap ignores shortcuts originating in inputs, textareas and
// contentEditable elements. Shortcuts that must work while typing (e.g. moving
// focus to the sidebar from the editor) bind through this instance instead.
let inputFriendlyMousetrap = null;
const getInputFriendlyMousetrap = () => {
  if (!inputFriendlyMousetrap && typeof document !== 'undefined') {
    inputFriendlyMousetrap = new Mousetrap();
    inputFriendlyMousetrap.stopCallback = () => false;
  }

  return inputFriendlyMousetrap;
};

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
 * @param {boolean} [options.allowInInputs=false] - Also fire while an input, textarea or contentEditable element has focus.
 * @param {Array} [options.deps=[]] - Additional dependencies that should trigger rebinding.
 */
function useKeybinding(action, handler, { enabled = true, allowInInputs = false, deps = [] } = {}) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const userKeyBindings = useSelector((state) => state.app.preferences?.keyBindings);
  const keybindingsEnabled = useSelector((state) => state.app.preferences?.keybindingsEnabled !== false);

  useEffect(() => {
    if (!enabled || !keybindingsEnabled) return;

    const combos = getKeyBindingsForActionAllOS(action, userKeyBindings);
    if (!combos) return;

    const trap = allowInInputs ? getInputFriendlyMousetrap() : Mousetrap;
    if (!trap) return;

    trap.bind(combos, (e) => {
      return handlerRef.current(e);
    });

    return () => {
      trap.unbind(combos);
    };
  }, [action, enabled, allowInInputs, keybindingsEnabled, userKeyBindings, ...deps]);
}

export default useKeybinding;
