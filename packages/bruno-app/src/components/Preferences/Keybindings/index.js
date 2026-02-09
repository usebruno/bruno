import React, { useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import StyledWrapper from './StyledWrapper';
import { isMacOS } from 'utils/common/platform';
import { IconRefresh } from '@tabler/icons';

// Adjust path to your project
import { savePreferences } from 'providers/ReduxStore/slices/app';

// ✅ Provide defaults in renderer (recommended).
// Create/export this constant from somewhere shared and import here.
// Example: export const DEFAULT_KEY_BINDINGS = defaultPreferences.keyBindings;
import { DEFAULT_KEY_BINDINGS } from 'providers/Hotkeys/keyMappings.js';

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
  return [...arr].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    const am = ai !== -1;
    const bm = bi !== -1;
    if (am && bm) return ai - bi;
    if (am) return -1;
    if (bm) return 1;
    return a.localeCompare(b);
  });
};

const fromKeysString = (keysStr) => (keysStr ? keysStr.split(SEP).filter(Boolean) : []);
const toKeysString = (keysArr) => sortCombo(Array.from(new Set(keysArr))).join(SEP);
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

const Keybindings = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);

  const os = getOS();

  // ✅ Source of truth
  const keyBindings = preferences?.keyBindings || {};

  // Build table data (action -> { name, keys })
  const keyMapping = useMemo(() => {
    const out = {};
    for (const [action, binding] of Object.entries(keyBindings)) {
      if (binding?.[os]) out[action] = { name: binding.name, keys: binding[os] };
    }
    return out;
  }, [keyBindings, os]);

  // Recording state
  const [recordingAction, setRecordingAction] = useState(null);
  const pressedKeysRef = useRef(new Set());
  const [draftByAction, setDraftByAction] = useState({}); // action -> string[]
  const [errorByAction, setErrorByAction] = useState({}); // action -> string

  const getCurrentRowKeysString = (action) => keyBindings?.[action]?.[os] || '';

  const getDefaultRowKeysString = (action) => DEFAULT_KEY_BINDINGS?.[action]?.[os] || '';

  const isRowDirty = (action) => {
    const current = getCurrentRowKeysString(action);
    const def = getDefaultRowKeysString(action);

    // If you don’t have defaults available, hide reset.
    if (!DEFAULT_KEY_BINDINGS) return false;

    return current !== def;
  };

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

  const validateCombo = (action, arr) => {
    const sig = comboSignature(arr);

    if (!sig) return 'Shortcut can’t be empty.';
    if (isOnlyModifiers(arr)) return 'Add a non-modifier key (e.g. Ctrl + K).';

    // OS-specific must-have modifier rule
    if (!hasRequiredModifier(os, arr)) {
      return os === 'mac'
        ? 'macOS shortcuts must include at least one modifier (command/alt/shift/ctrl).'
        : 'Windows shortcuts must include at least one modifier (ctrl/alt/shift).';
    }

    // OS reserved
    if (RESERVED_BY_OS[os]?.has(sig)) return 'That shortcut is reserved by the OS.';

    // No duplicates (across all other actions)
    if (buildUsedSignatures(action).has(sig)) return 'That shortcut is already in use.';

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

    const arr = sortCombo(Array.from(new Set(draftArr)));
    const err = validateCombo(action, arr);

    if (err) {
      setErrorByAction((prev) => ({ ...prev, [action]: err }));
      // MUST HAVE RULE: snap back to existing preference value
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

    // ✅ Persist immediately: preferences is the source of truth for the whole app
    persistToPreferences(action, nextKeys);
  };

  const resetRowToDefault = (action) => {
    if (!DEFAULT_KEY_BINDINGS?.[action]?.[os]) return;

    // Clear errors/draft
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

    // Persist default
    persistToPreferences(action, DEFAULT_KEY_BINDINGS[action][os]);
  };

  const handleFocus = (action) => {
    setRecordingAction(action);
    pressedKeysRef.current = new Set();

    // seed draft with current value
    setDraftByAction((prev) => ({
      ...prev,
      [action]: fromKeysString(getCurrentRowKeysString(action))
    }));

    // clear error on focus
    setErrorByAction((prev) => {
      const next = { ...prev };
      delete next[action];
      return next;
    });
  };

  const handleBlur = (action) => {
    commitCombo(action);
    setRecordingAction(null);
    pressedKeysRef.current = new Set();
  };

  const handleKeyDown = (action, e) => {
    if (recordingAction !== action) return;

    e.preventDefault();
    e.stopPropagation();

    // Clear draft
    if (e.key === 'Backspace' || e.key === 'Delete') {
      pressedKeysRef.current = new Set();
      setDraftByAction((prev) => ({ ...prev, [action]: [] }));
      return;
    }

    if (e.repeat) return;

    const keyName = normalizeKey(e);
    if (!keyName) return;

    pressedKeysRef.current.add(keyName);

    setDraftByAction((prev) => ({
      ...prev,
      [action]: sortCombo(Array.from(pressedKeysRef.current))
    }));
  };

  const handleKeyUp = (action, e) => {
    if (recordingAction !== action) return;

    e.preventDefault();
    e.stopPropagation();

    const keyName = normalizeKey(e);
    if (!keyName) return;

    pressedKeysRef.current.delete(keyName);

    // Commit when user releases all keys
    if (pressedKeysRef.current.size === 0) {
      commitCombo(action);
    }
  };

  const renderValue = (action) => {
    const arr
      = recordingAction === action
        ? draftByAction[action]
        : fromKeysString(getCurrentRowKeysString(action));

    return (arr || []).join(' + ');
  };

  return (
    <StyledWrapper className="w-full">
      <div className="section-header">Keybindings</div>

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
              Object.entries(keyMapping).map(([action, row]) => (
                <tr key={action}>
                  <td>{row.name}</td>

                  <td>
                    <div className="keybinding-row">
                      <div className="shortcut-wrap">
                        <input
                          className={`shortcut-input ${
                            errorByAction[action] ? 'shortcut-input--error' : ''
                          }`}
                          value={renderValue(action)}
                          placeholder={recordingAction === action ? 'Recording…' : 'Press keys…'}
                          onFocus={() => handleFocus(action)}
                          onBlur={() => handleBlur(action)}
                          onKeyDown={(e) => handleKeyDown(action, e)}
                          onKeyUp={(e) => handleKeyUp(action, e)}
                          readOnly
                          spellCheck={false}
                        />
                        {recordingAction === action && <span className="recording-dot" />}
                      </div>

                      {isRowDirty(action) && (
                        <button
                          type="button"
                          className="reset-btn"
                          onClick={() => resetRowToDefault(action)}
                          title="Reset to default"
                        >
                          <IconRefresh size={16} stroke={1} />
                        </button>
                      )}
                    </div>

                    {errorByAction[action] && (
                      <div className="shortcut-error">{errorByAction[action]}</div>
                    )}
                  </td>
                </tr>
              ))
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
