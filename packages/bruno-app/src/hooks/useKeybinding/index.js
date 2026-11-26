import { useEffect, useRef } from 'react';
import Mousetrap from 'mousetrap';
import { useSelector } from 'react-redux';
import { getKeyBindingsForActionAllOS } from 'providers/Hotkeys/keyMappings';

const isTextField = (element) =>
  element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA' || element.isContentEditable;

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
 * @param {Object} [options.scopeRef] - Ref to an element to bind inside instead of the document. Inside it, shortcuts with Ctrl or Cmd also fire from text fields.
 */
function useKeybinding(action, handler, { enabled = true, deps = [], scopeRef } = {}) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const userKeyBindings = useSelector((state) => state.app.preferences?.keyBindings);
  const keybindingsEnabled = useSelector((state) => state.app.preferences?.keybindingsEnabled !== false);

  useEffect(() => {
    if (!enabled || !keybindingsEnabled) return;

    const combos = getKeyBindingsForActionAllOS(action, userKeyBindings);
    if (!combos) return;

    let mousetrap = Mousetrap;
    if (scopeRef) {
      if (!scopeRef.current) return;
      mousetrap = new Mousetrap(scopeRef.current);
      mousetrap.stopCallback = (e, element) => isTextField(element) && !e.ctrlKey && !e.metaKey;
    }
    mousetrap.bind(combos, (e) => {
      return handlerRef.current(e);
    });

    return () => {
      mousetrap.unbind(combos);
    };
  }, [action, enabled, keybindingsEnabled, userKeyBindings, scopeRef, ...deps]);
}

export default useKeybinding;
