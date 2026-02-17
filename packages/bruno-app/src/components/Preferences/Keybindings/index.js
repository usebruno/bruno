import React, { useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import StyledWrapper from './StyledWrapper';
import { IconRefresh, IconPencil } from '@tabler/icons';
import { isMacOS } from 'utils/common/platform';

import { savePreferences } from 'providers/ReduxStore/slices/app';
import { DEFAULT_KEY_BINDINGS } from 'providers/Hotkeys/keyMappings.js';
import { Tooltip } from 'react-tooltip';

const SEP = '+bind+';
const getOS = () => (isMacOS() ? 'mac' : 'windows');

// Stored tokens must match your preferences defaults (lowercase)
const MODIFIERS = new Set(['ctrl', 'command', 'alt', 'shift']);

const REQUIRED_MODIFIERS_BY_OS = {
  mac: new Set(['command', 'alt', 'shift', 'ctrl']),
  windows: new Set(['ctrl', 'alt', 'shift']) // command (Win key) should NOT count
};

const hasRequiredModifier = (os, arr) => arr.some((k) => REQUIRED_MODIFIERS_BY_OS[os]?.has(k));
const isOnlyModifiers = (arr) => arr.length > 0 && arr.every((k) => MODIFIERS.has(k));

const sortCombo = (arr) => {
  const order = ['ctrl', 'command', 'alt', 'shift'];
  const modifiers = [];
  const nonModifiers = [];

  // Separate modifiers from non-modifiers
  arr.forEach((key) => {
    if (order.includes(key)) {
      modifiers.push(key);
    } else {
      nonModifiers.push(key);
    }
  });

  // Sort modifiers by their order
  modifiers.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  // Keep non-modifiers in the order they were pressed (don't sort them)
  return [...modifiers, ...nonModifiers];
};

const uniqSorted = (arr) => {
  // Remove duplicates while preserving order
  const unique = [];
  const seen = new Set();
  arr.forEach((key) => {
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(key);
    }
  });
  return sortCombo(unique);
};

const fromKeysString = (keysStr) => (keysStr ? keysStr.split(SEP).filter(Boolean) : []);
const toKeysString = (keysArr) => uniqSorted(keysArr).join(SEP);

// Signature MUST be stable: unique + sorted
const comboSignature = (arr) => toKeysString(arr);

// OS reserved shortcuts in stored-token format
const RESERVED_BY_OS = {
  mac: new Set([
    comboSignature(['command', 'q']),
    comboSignature(['command', 'w']),
    comboSignature(['command', 'h']),
    comboSignature(['command', 'm']),
    comboSignature(['command', 'tab']),
    comboSignature(['command', 'space']),
    comboSignature(['ctrl', 'command', 'q']),
    comboSignature(['command', ',']),
    comboSignature(['command', 'shift', '3']),
    comboSignature(['command', 'shift', '4']),
    comboSignature(['command', 'shift', '5']),
    comboSignature(['command', 'alt', 'esc'])
  ]),
  windows: new Set([
    comboSignature(['alt', 'tab']),
    comboSignature(['alt', 'f4']),
    comboSignature(['ctrl', 'alt', 'delete']),
    comboSignature(['command', 'l']),
    comboSignature(['command', 'd']),
    comboSignature(['command', 'e']),
    comboSignature(['command', 'r']),
    comboSignature(['command', 'tab']),
    comboSignature(['ctrl', 'shift', 'esc'])
  ])
};

// normalize keyboard event -> stored tokens
const normalizeKey = (e) => {
  const k = e.key;

  // ignore lock keys
  if (k === 'CapsLock' || k === 'NumLock' || k === 'ScrollLock') return null;

  if (k === ' ') return 'space';
  if (k === 'Escape') return 'esc';
  if (k === 'Control') return 'ctrl';
  if (k === 'Alt') return 'alt';
  if (k === 'Shift') return 'shift';
  if (k === 'Enter') return 'enter';
  if (k === 'Backspace') return 'backspace';
  if (k === 'Tab') return 'tab';
  if (k === 'Delete') return 'delete';

  // Meta -> command (matches your stored default format)
  if (k === 'Meta') return 'command';

  // single char (letters/punct) to lowercase
  if (k.length === 1) return k.toLowerCase();

  // ArrowUp -> arrowup, PageUp -> pageup, etc
  return k.toLowerCase();
};

const ERROR = {
  EMPTY: 'EMPTY',
  ONLY_MODIFIERS: 'ONLY_MODIFIERS',
  MISSING_REQUIRED_MOD: 'MISSING_REQUIRED_MOD',
  RESERVED: 'RESERVED',
  DUPLICATE: 'DUPLICATE',
  CONFLICT: 'CONFLICT'
};

const Keybindings = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);

  const os = getOS();

  //  Source of truth: merge defaults with user preferences
  const keyBindings = useMemo(() => {
    const merged = {};

    // Start with defaults
    for (const [action, binding] of Object.entries(DEFAULT_KEY_BINDINGS)) {
      merged[action] = { ...binding };
    }

    // Override with user preferences
    const userBindings = preferences?.keyBindings || {};
    for (const [action, binding] of Object.entries(userBindings)) {
      if (merged[action]) {
        // Merge user's OS-specific overrides into defaults
        merged[action] = {
          ...merged[action],
          ...binding
        };
      }
    }

    return merged;
  }, [preferences?.keyBindings]);

  // Build table data (action -> { name, keys })
  const keyMapping = useMemo(() => {
    const out = {};
    for (const [action, binding] of Object.entries(keyBindings)) {
      if (binding?.[os]) out[action] = { name: binding.name, keys: binding[os] };
    }
    return out;
  }, [keyBindings, os]);

  // ✏️ which row is allowed to edit (pencil clicked)
  const [editingAction, setEditingAction] = useState(null);

  //  hover tracking (for showing pencil/refresh only on hover row)
  const [hoveredAction, setHoveredAction] = useState(null);

  // Recording state
  const [recordingAction, setRecordingAction] = useState(null);
  const pressedKeysRef = useRef(new Set());
  const inputRefs = useRef({});
  const [draftByAction, setDraftByAction] = useState({}); // action -> string[]
  const [errorByAction, setErrorByAction] = useState({}); // action -> { code, message }

  const getCurrentRowKeysString = (action) => keyBindings?.[action]?.[os] || '';
  const getDefaultRowKeysString = (action) => DEFAULT_KEY_BINDINGS?.[action]?.[os] || '';

  const isRowDirty = (action) => {
    const current = getCurrentRowKeysString(action);
    const def = getDefaultRowKeysString(action);
    if (!DEFAULT_KEY_BINDINGS) return false;
    return current !== def;
  };

  // Check if any keybinding is dirty (different from default)
  const hasDirtyRows = useMemo(() => {
    for (const action of Object.keys(DEFAULT_KEY_BINDINGS)) {
      if (isRowDirty(action)) {
        return true;
      }
    }
    return false;
  }, [keyBindings, os]);

  const revertDraftToCurrent = (action) => {
    const currentArr = fromKeysString(getCurrentRowKeysString(action));
    setDraftByAction((prev) => ({ ...prev, [action]: currentArr }));
  };

  const buildUsedSignatures = (excludeAction) => {
    const used = new Set();
    for (const [action, binding] of Object.entries(keyBindings)) {
      if (action === excludeAction) continue;
      const keysStr = binding?.[os];
      if (!keysStr) continue;
      used.add(comboSignature(fromKeysString(keysStr)));
    }
    return used;
  };

  const validateCombo = (action, arrRaw) => {
    const arr = uniqSorted(arrRaw);
    const sig = comboSignature(arr);

    if (!sig) return { code: ERROR.EMPTY, message: 'Shortcut can’t be empty.' };
    if (isOnlyModifiers(arr))
      return { code: ERROR.ONLY_MODIFIERS, message: 'Add a non-modifier key (e.g. Ctrl + K).' };

    // OS-specific must-have modifier rule
    if (!hasRequiredModifier(os, arr)) {
      return {
        code: ERROR.MISSING_REQUIRED_MOD,
        message:
          os === 'mac'
            ? 'macOS shortcuts must include at least one modifier (command/alt/shift/ctrl).'
            : 'Windows shortcuts must include at least one modifier (ctrl/alt/shift).'
      };
    }

    // OS reserved
    if (RESERVED_BY_OS[os]?.has(sig))
      return { code: ERROR.RESERVED, message: 'This shortcut is reserved by the OS.' };

    // No duplicates (across all other actions)
    if (buildUsedSignatures(action).has(sig))
      return { code: ERROR.DUPLICATE, message: 'That shortcut is already in use.' };

    // Check for subset conflicts (e.g., Cmd+A conflicts with Cmd+Z+A)
    for (const [otherAction, binding] of Object.entries(keyBindings)) {
      if (otherAction === action) continue;
      const otherKeysStr = binding?.[os];
      if (!otherKeysStr) continue;

      const otherKeys = fromKeysString(otherKeysStr);

      // Check if current is a subset of other (current is shorter)
      if (arr.length < otherKeys.length) {
        const isSubset = arr.every((k) => otherKeys.includes(k));
        if (isSubset) {
          return {
            code: ERROR.CONFLICT,
            message: `Conflicts with "${binding.name}" (${otherKeys.join(' + ')}). Remove the longer shortcut first.`
          };
        }
      }

      // Check if other is a subset of current (current is longer)
      if (arr.length > otherKeys.length) {
        const isSubset = otherKeys.every((k) => arr.includes(k));
        if (isSubset) {
          return {
            code: ERROR.CONFLICT,
            message: `Conflicts with "${binding.name}" (${otherKeys.join(' + ')}). Remove that shortcut first.`
          };
        }
      }
    }

    return null;
  };

  const persistToPreferences = (action, nextKeys) => {
    const updatedPreferences = {
      ...preferences,
      keyBindings: {
        ...(preferences?.keyBindings || {}),
        [action]: {
          ...(preferences?.keyBindings?.[action] || {}),
          name: preferences?.keyBindings?.[action]?.name || action,
          [os]: nextKeys
        }
      }
    };

    dispatch(savePreferences(updatedPreferences));
  };

  const commitCombo = (action) => {
    const draftArr = draftByAction[action] || [];
    if (!draftArr.length) return;

    const arr = uniqSorted(draftArr);
    const err = validateCombo(action, arr);

    if (err) {
      setErrorByAction((prev) => ({ ...prev, [action]: err }));
      // keep UX consistent: never leave an invalid combo displayed
      revertDraftToCurrent(action);
      return;
    }

    // clear error for this row
    setErrorByAction((prev) => {
      const next = { ...prev };
      delete next[action];
      return next;
    });

    const nextKeys = toKeysString(arr);

    // avoid redundant write if unchanged
    const currentKeys = getCurrentRowKeysString(action);
    if (nextKeys === currentKeys) return;

    // persist immediately: preferences is the source of truth
    persistToPreferences(action, nextKeys);
  };

  const resetRowToDefault = (action) => {
    const def = DEFAULT_KEY_BINDINGS?.[action]?.[os];
    if (!def) return;

    setErrorByAction((prev) => {
      const next = { ...prev };
      delete next[action];
      return next;
    });

    setDraftByAction((prev) => {
      const next = { ...prev };
      delete next[action];
      return next;
    });

    persistToPreferences(action, def);
  };

  const resetAllKeybindings = () => {
    const updatedPreferences = {
      ...preferences,
      keyBindings: {}
    };
    dispatch(savePreferences(updatedPreferences));
  };

  const startEditing = (action) => {
    // if another row is editing, commit/stop it first
    if (editingAction && editingAction !== action) {
      commitCombo(editingAction);
    }

    setEditingAction(action);
    setRecordingAction(action);
    pressedKeysRef.current = new Set();

    // seed draft with current value
    setDraftByAction((prev) => ({
      ...prev,
      [action]: fromKeysString(getCurrentRowKeysString(action))
    }));

    // clear error on start edit
    setErrorByAction((prev) => {
      const next = { ...prev };
      delete next[action];
      return next;
    });

    requestAnimationFrame(() => {
      inputRefs.current[action]?.focus?.();
      inputRefs.current[action]?.setSelectionRange?.(
        inputRefs.current[action].value.length,
        inputRefs.current[action].value.length
      );
    });
  };

  const stopEditing = (action) => {
    commitCombo(action);
    setRecordingAction(null);
    setEditingAction(null);
    pressedKeysRef.current = new Set();
  };

  const handleKeyDown = (action, e) => {
    if (recordingAction !== action || editingAction !== action) return;

    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Backspace' || e.key === 'Delete') {
      pressedKeysRef.current = new Set();
      setDraftByAction((prev) => ({ ...prev, [action]: [] }));
      // Show error immediately for empty combo
      setErrorByAction((prev) => ({
        ...prev,
        [action]: { code: ERROR.EMPTY, message: 'Shortcut can\'t be empty.' }
      }));
      return;
    }

    if (e.repeat) return;

    const keyName = normalizeKey(e);
    if (!keyName) return;

    pressedKeysRef.current.add(keyName);

    const currentDraft = uniqSorted(Array.from(pressedKeysRef.current));

    setDraftByAction((prev) => ({
      ...prev,
      [action]: currentDraft
    }));

    // Validate in real-time as user types
    const err = validateCombo(action, currentDraft);
    if (err) {
      setErrorByAction((prev) => ({ ...prev, [action]: err }));
    } else {
      // Clear error if combo is now valid
      setErrorByAction((prev) => {
        const next = { ...prev };
        delete next[action];
        return next;
      });
    }
  };

  const handleKeyUp = (action, e) => {
    if (recordingAction !== action || editingAction !== action) return;

    e.preventDefault();
    e.stopPropagation();

    const keyName = normalizeKey(e);
    if (!keyName) return;

    pressedKeysRef.current.delete(keyName);

    // commit when user releases all keys
    if (pressedKeysRef.current.size === 0) {
      stopEditing(action);
    }
  };

  const renderValue = (action) => {
    const arr
      = recordingAction === action ? draftByAction[action] : fromKeysString(getCurrentRowKeysString(action));

    return (arr || []).join(' + ');
  };

  return (
    <StyledWrapper className="w-full">
      <Tooltip
        id="kb-editing-error-tooltip"
        place="bottom-start"
        opacity={1}
        className="kb-tooltip kb-tooltip--error"
      />

      <div className="section-header">
        <span>Keybindings</span>
        {hasDirtyRows && (
          <button
            type="button"
            className="reset-all-btn"
            onClick={resetAllKeybindings}
            title="Reset all keybindings to default"
          >
            <IconRefresh size={14} stroke={1.5} />
            {/* <span>Reset All</span> */}
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Command</th>
              <th>Keybinding</th>
            </tr>
          </thead>
          <tbody>
            {keyMapping ? (
              Object.entries(keyMapping).map(([action, row]) => {
                const isEditing = editingAction === action;
                const isHovered = hoveredAction === action;
                const isDirty = isRowDirty(action);

                const showPencil = isHovered && !isEditing && !isDirty;
                const showRefresh = isDirty && !isEditing;
                const hasError = Boolean(errorByAction[action]?.message);
                const errorMessage = errorByAction[action]?.message;
                const inputId = `kb-input-${action}`;

                return (
                  <tr
                    key={action}
                    data-testid={`keybinding-row-${action}`}
                    onMouseEnter={() => setHoveredAction(action)}
                    onMouseLeave={() => setHoveredAction((prev) => (prev === action ? null : prev))}
                  >
                    <td data-testid={`keybinding-name-${action}`}>{row.name}</td>

                    <td>
                      <div className="keybinding-row">
                        <div className="shortcut-wrap">
                          <input
                            id={inputId}
                            ref={(el) => {
                              if (el) inputRefs.current[action] = el;
                            }}
                            data-testid={`keybinding-input-${action}`}
                            className={`shortcut-input ${hasError ? 'shortcut-input--error' : ''}`}
                            value={renderValue(action)}
                            readOnly={!isEditing}
                            onKeyDown={(e) => handleKeyDown(action, e)}
                            onKeyUp={(e) => handleKeyUp(action, e)}
                            onBlur={() => {
                              if (isEditing) stopEditing(action);
                            }}
                            spellCheck={false}
                          />
                          {isEditing && hasError && (
                            <Tooltip
                              id={`kb-editing-error-tooltip-${action}`}
                              anchorSelect={`#${inputId}`}
                              place="bottom-start"
                              opacity={1}
                              isOpen={true}
                              content={errorMessage}
                              className="kb-tooltip kb-tooltip--error"
                            />
                          )}
                        </div>

                        {showRefresh && (
                          <button
                            type="button"
                            className="reset-btn"
                            data-testid={`keybinding-reset-${action}`}
                            onClick={() => resetRowToDefault(action)}
                            title="Reset to default"
                          >
                            <IconRefresh size={12} stroke={1} />
                          </button>
                        )}
                        {showPencil && (
                          <button
                            type="button"
                            className="edit-btn"
                            data-testid={`keybinding-edit-${action}`}
                            onClick={() => startEditing(action)}
                            title="Edit shortcut"
                          >
                            <IconPencil size={12} stroke={1.5} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="2">No key bindings available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </StyledWrapper>
  );
};

export default Keybindings;
