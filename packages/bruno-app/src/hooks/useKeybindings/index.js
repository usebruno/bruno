import { useCallback, useMemo } from 'react';

export const Key = Object.freeze({
  Enter: 'enter',
  Escape: 'escape',
  ArrowUp: 'arrowup',
  ArrowDown: 'arrowdown',
  ArrowLeft: 'arrowleft',
  ArrowRight: 'arrowright',
  Period: '.',
  Tab: 'tab',
  Backspace: 'backspace',
  Delete: 'delete',
  A: 'a',
  B: 'b',
  C: 'c',
  D: 'd',
  E: 'e',
  F: 'f',
  G: 'g',
  H: 'h',
  I: 'i',
  J: 'j',
  K: 'k',
  L: 'l',
  M: 'm',
  N: 'n',
  O: 'o',
  P: 'p',
  Q: 'q',
  R: 'r',
  S: 's',
  T: 't',
  U: 'u',
  V: 'v',
  W: 'w',
  X: 'x',
  Y: 'y',
  Z: 'z',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  0: '0'
});

export const KeyList = Object.values(Key);

export const Modifier = Object.freeze({
  Alt: 'altKey',
  Shift: 'shiftKey',
  CmdOrCtrl: 'cmdOrCtrl' // Special case for handling Command on Mac and Control on Windows/Linux
});

export const ModifierList = Object.values(Modifier);

const defaultModifiers = [];

const evaluateModifiersMatch = (e, requiredModifiers) => {
  const requiredModifierSet = new Set(requiredModifiers);
  for (const modifier of ModifierList) {
    const isRequired = requiredModifierSet.has(modifier);

    if (modifier === Modifier.CmdOrCtrl) {
      const isCmdOrCtrlPressed = e.metaKey || e.ctrlKey;
      if (isRequired && !isCmdOrCtrlPressed) return false;
      if (!isRequired && isCmdOrCtrlPressed) return false;
    } else {
      const isPressed = e[modifier];
      if (isRequired && !isPressed) return false;
      if (!isRequired && isPressed) return false;
    }
  }

  return true;
};

/**
 * Factory function to create a keybinding configuration object.
 * @param {Object} params
 * @param {Function} params.actionFn - The function to execute when the keybinding is triggered.
 * @param {Array} params.modifiers - An array specifying which modifier keys are required for the keybinding (e.g., [Modifier.Meta]).
 * @param {string} params.alias - A unique alias for the keybinding, used for internal registry and debugging.
 * @param {string} params.description - A description of the keybinding's action, used for documentation and debugging.
 * @returns {Object} A keybinding configuration object that can be used with the useKeybindings hook.
 *
 * Example usage:
 * const renameKeybinding = createKeybinding({
 *   actionFn: () => console.log('Rename action'),
 *   modifiers: [Modifier.Meta],
 *   alias: 'rename',
 *   description: 'Triggers the rename action when Meta+R is pressed'
 * });
 */
export const createKeybinding = ({ actionFn, modifiers = [], alias, description }) => {
  return { actionFn, modifiers, alias, description };
};

/**
 * Custom hook to handle keybindings in a React component.
 * @param {Object} keybindings - An object mapping keys to their corresponding action functions and modifiers.
 * @param {Object} options - Optional configuration for keybinding behavior.
 * @param {boolean} options.preventDefault - Whether to call e.preventDefault() when a keybinding is triggered.
 * @param {boolean} options.stopPropagation - Whether to call e.stopPropagation() when a keybinding is triggered.
 * @param {Object} options.interceptors - Optional interceptors for before and after action execution.
 * @param {Function} options.interceptors.beforeAction - A function to be called before the action function is executed. Receives the event and keybinding config as arguments.
 * @param {Function} options.interceptors.afterAction - A function to be called after the action function is executed. Receives the event and keybinding config as arguments.
 * @param {Function} options.onSuccess - A callback function that is called if the action function executes successfully. Receives the event as an argument.
 * @param {Function} options.onError - A callback function that is called if the action function throws an error. Receives the error and event as arguments.
 * @returns {Function} A keydown event handler that can be attached to a React component.
 *
 * Example usage:
 * const keybindings = {
 *   [Key.R]: { actionFn: () => console.log('Rename action'), modifiers: [Modifier.Meta] },
 *   [Key.V]: { actionFn: () => console.log('Paste action'), modifiers: [Modifier.Control] }
 * };
 *
 * const options = { preventDefault: true, stopPropagation: true };
 *
 * const handleKeyDown = useKeybindings({ keybindings, options });
 *
 * return <div onKeyDown={handleKeyDown}>Press Meta+R to rename, Ctrl+V to paste</div>;
 */
export const useKeybindings = (keybindings = {}, options = {}) => {
  const keybindingRegistry = useMemo(() => {
    const registry = {};

    for (const [, { actionFn, modifiers, alias, description }] of Object.entries(keybindings || {})) {
      if (!alias) continue; // Skip if no alias is provided
      registry[alias] = { actionFn, modifiers, description };
    }

    return registry;
  }, [keybindings]);

  const handleKeyPress = useCallback((e) => {
    const pressedKey = e.key;
    const keyBinding = keybindings?.[pressedKey.toLowerCase()];
    if (!keyBinding) return;

    const { actionFn, modifiers = [] } = keyBinding;

    // Merge default modifiers with provided modifiers
    const effectiveModifiers = modifiers;
    const doModifiersMatch = evaluateModifiersMatch(e, effectiveModifiers);

    if (!doModifiersMatch) return;

    try {
      options?.interceptors?.beforeAction?.(e, keyBinding);
    } catch (error) {
      console.error(`Error in beforeAction interceptor for key ${pressedKey}:`, error);
    }

    try {
      actionFn();
      options?.onSuccess?.(e);
    } catch (error) {
      console.error(`Error executing action for key ${pressedKey}:`, error);
      options?.onError?.(error, e);
    }

    try {
      options?.interceptors?.afterAction?.(e, keyBinding);
    } catch (error) {
      console.error(`Error in afterAction interceptor for key ${pressedKey}:`, error);
    }

    if (options?.preventDefault) e.preventDefault();
    if (options?.stopPropagation) e.stopPropagation();
  }, [keybindings, options]);

  return {
    handleKeyPress,
    ...keybindingRegistry
  };
};

export default useKeybindings;
