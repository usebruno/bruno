import React, { useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

import StyledWrapper from './StyledWrapper';
import { IconReload, IconPencil, IconLock } from '@tabler/icons';
import { isMacOS } from 'utils/common/platform';

import { savePreferences } from 'providers/ReduxStore/slices/app';
import { DEFAULT_KEY_BINDINGS, KEY_BINDING_SECTIONS } from 'providers/Hotkeys/keyMappings.js';
import { Tooltip } from 'react-tooltip';

const SEP = '+bind+';
const getOS = () => (isMacOS() ? 'mac' : 'windows');

// Modifier tokens used in stored preferences.
// These are lowercase on purpose so they match persisted values.
const MODIFIERS = new Set(['ctrl', 'command', 'alt', 'shift']);

// Required modifier policy by OS.
// On macOS, command/ctrl/alt/shift are allowed as the required modifier.
// On Windows, command should not count as a valid modifier for app shortcuts.
const REQUIRED_MODIFIERS_BY_OS = {
  mac: new Set(['command', 'alt', 'shift', 'ctrl']),
  windows: new Set(['ctrl', 'alt', 'shift'])
};

const hasRequiredModifier = (os, arr) => arr.some((k) => REQUIRED_MODIFIERS_BY_OS[os]?.has(k));
const isOnlyModifiers = (arr) => arr.length > 0 && arr.every((k) => MODIFIERS.has(k));

// Keep a stable modifier order for display, storage, and duplicate detection.
// Non-modifier keys keep their original order.
const MODIFIER_ORDER = ['ctrl', 'command', 'alt', 'shift'];

const sortCombo = (arr) => {
  const modifiers = [];
  const nonModifiers = [];

  arr.forEach((key) => {
    if (MODIFIERS.has(key)) {
      modifiers.push(key);
    } else {
      nonModifiers.push(key);
    }
  });

  modifiers.sort((a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b));

  return [...modifiers, ...nonModifiers];
};

// Remove duplicates while preserving insertion order, then apply stable sorting.
const uniqSorted = (arr) => {
  const seen = new Set();
  const unique = [];

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

// Signature is intentionally exact.
// This means:
// - command + f
// - command + shift + f
// are treated as different shortcuts and can coexist.
// Only an exact same normalized combo is considered duplicate.
const comboSignature = (arr) => toKeysString(arr);

// OS reserved shortcuts in stored-token format.
// These are blocked because they are usually intercepted by the OS/window manager.
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

// Normalize keyboard event to stored token format.
// The output must stay aligned with default preference values.
const normalizeKey = (e) => {
  const k = e.key;

  // Ignore lock keys. They should not be recordable shortcuts.
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

  // Meta maps to command so storage format stays consistent across the app.
  if (k === 'Meta') return 'command';

  // Single printable chars become lowercase.
  if (k.length === 1) return k.toLowerCase();

  // ArrowUp -> arrowup, PageUp -> pageup, etc.
  return k.toLowerCase();
};

const ERROR = {
  EMPTY: 'EMPTY',
  ONLY_MODIFIERS: 'ONLY_MODIFIERS',
  MISSING_REQUIRED_MOD: 'MISSING_REQUIRED_MOD',
  RESERVED: 'RESERVED',
  DUPLICATE: 'DUPLICATE'
};

const Keybindings = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);

  const os = getOS();

  // Source of truth:
  // Start from defaults, then merge user-specific overrides on top.
  const keyBindings = useMemo(() => {
    const merged = {};

    for (const [action, binding] of Object.entries(DEFAULT_KEY_BINDINGS)) {
      merged[action] = { ...binding };
    }

    const userBindings = preferences?.keyBindings || {};
    for (const [action, binding] of Object.entries(userBindings)) {
      if (merged[action]) {
        merged[action] = {
          ...merged[action],
          ...binding
        };
      }
    }

    return merged;
  }, [preferences?.keyBindings]);

  // Build grouped rows for current OS only and skip hidden bindings.
  const groupedKeyMappings = useMemo(() => {
    return KEY_BINDING_SECTIONS.map((section) => {
      const rows = Object.entries(section.bindings || {})
        .map(([action]) => {
          const binding = keyBindings[action];
          if (!binding?.[os] || binding.hidden) return null;

          return {
            action,
            name: binding.name,
            keys: binding[os],
            readOnly: binding.readOnly,
            displayValue: binding.displayValue
          };
        })
        .filter(Boolean);

      return {
        heading: section.heading,
        rows
      };
    }).filter((section) => section.rows.length > 0);
  }, [keyBindings, os]);

  // editingAction:
  // The row currently in edit mode.
  const [editingAction, setEditingAction] = useState(null);

  // hoveredAction:
  // Tracks row hover state to show pencil/reset/lock controls.
  const [hoveredAction, setHoveredAction] = useState(null);

  // recordingAction:
  // The row actively listening for key presses.
  const [recordingAction, setRecordingAction] = useState(null);

  // Tracks currently held keys while recording.
  // A Set allows more than 2 keys and avoids duplicates naturally.
  const pressedKeysRef = useRef(new Set());

  // Refs for row inputs, used to focus the selected row when editing starts.
  const inputRefs = useRef({});

  // draftByAction:
  // Temporary in-progress shortcut for a row while editing.
  const [draftByAction, setDraftByAction] = useState({});

  // errorByAction:
  // Validation result per row while editing.
  const [errorByAction, setErrorByAction] = useState({});

  const getCurrentRowKeysString = (action) => keyBindings?.[action]?.[os] || '';
  const getDefaultRowKeysString = (action) => DEFAULT_KEY_BINDINGS?.[action]?.[os] || '';

  const isRowDirty = (action) => {
    const current = getCurrentRowKeysString(action);
    const def = getDefaultRowKeysString(action);

    if (!DEFAULT_KEY_BINDINGS) return false;
    return current !== def;
  };

  // Whether any row differs from the default binding.
  const hasDirtyRows = useMemo(() => {
    for (const action of Object.keys(DEFAULT_KEY_BINDINGS)) {
      if (isRowDirty(action)) {
        return true;
      }
    }
    return false;
  }, [keyBindings, os]);

  // Build a set of exact normalized signatures for all shortcuts except the row being edited.
  // This allows:
  // - command + f
  // - command + shift + f
  // to coexist, because signatures differ.
  const buildUsedSignatures = (excludeAction) => {
    const used = new Set();

    for (const [action, binding] of Object.entries(keyBindings)) {
      if (action === excludeAction) continue;

      const keysStr = binding?.[os];
      if (!keysStr) continue;

      const normalized = comboSignature(fromKeysString(keysStr));
      if (normalized) used.add(normalized);
    }

    return used;
  };

  // Validate only the exact current combo.
  // No subset/superset conflict detection is done here.
  const validateCombo = (action, arrRaw) => {
    const arr = uniqSorted(arrRaw);
    const sig = comboSignature(arr);

    if (!sig) {
      return { code: ERROR.EMPTY, message: `Shortcut can’t be empty.` };
    }

    if (isOnlyModifiers(arr)) {
      return {
        code: ERROR.ONLY_MODIFIERS,
        message: 'Add a non-modifier key (e.g. Ctrl + K).'
      };
    }

    if (!hasRequiredModifier(os, arr)) {
      return {
        code: ERROR.MISSING_REQUIRED_MOD,
        message:
          os === 'mac'
            ? 'macOS shortcuts must include at least one modifier (command/alt/shift/ctrl).'
            : 'Windows shortcuts must include at least one modifier (ctrl/alt/shift).'
      };
    }

    if (RESERVED_BY_OS[os]?.has(sig)) {
      return {
        code: ERROR.RESERVED,
        message: 'This shortcut is reserved by the OS.'
      };
    }

    // Exact duplicate only.
    // Example:
    // - command + f conflicts with command + f
    // - command + shift + f does not conflict with command + f
    if (buildUsedSignatures(action).has(sig)) {
      return {
        code: ERROR.DUPLICATE,
        message: 'That shortcut is already in use.'
      };
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
          name: preferences?.keyBindings?.[action]?.name || DEFAULT_KEY_BINDINGS?.[action]?.name || action,
          [os]: nextKeys
        }
      }
    };

    dispatch(savePreferences(updatedPreferences));
  };

  // Commit the draft only if it is valid.
  // Returns true if saved or unchanged, false if invalid.
  const commitCombo = (action) => {
    const draftArr = draftByAction[action] || [];
    if (!draftArr.length) return;

    const arr = uniqSorted(draftArr);
    const err = validateCombo(action, arr);

    if (err) {
      setErrorByAction((prev) => ({ ...prev, [action]: err }));
      return false;
    }

    setErrorByAction((prev) => {
      const next = { ...prev };
      delete next[action];
      return next;
    });

    const nextKeys = toKeysString(arr);
    const currentKeys = getCurrentRowKeysString(action);

    if (nextKeys === currentKeys) return true;

    persistToPreferences(action, nextKeys);

    const commandName = keyBindings?.[action]?.name || action;
    toast.success(`"${commandName}" shortcut updated`, { autoClose: 2000 });

    return true;
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
    // If another row is already editing, try to commit it first.
    // If invalid, keep the previous row active.
    if (editingAction && editingAction !== action) {
      const ok = commitCombo(editingAction);
      if (ok) {
        setRecordingAction(null);
        setEditingAction(null);
        pressedKeysRef.current = new Set();
      } else {
        return;
      }
    }

    setEditingAction(action);
    setRecordingAction(action);
    pressedKeysRef.current = new Set();

    // Seed the draft with the current saved value so the row reflects existing state.
    setDraftByAction((prev) => ({
      ...prev,
      [action]: fromKeysString(getCurrentRowKeysString(action))
    }));

    // Clear any previous validation error for this row.
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
    const ok = commitCombo(action);

    if (!ok) {
      // On invalid commit, discard the invalid draft and restore saved value.
      cancelEditing(action);
      return;
    }

    setRecordingAction(null);
    setEditingAction(null);
    pressedKeysRef.current = new Set();
  };

  // Cancel editing and restore the persisted value.
  const cancelEditing = (action) => {
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

    setRecordingAction(null);
    setEditingAction(null);
    pressedKeysRef.current = new Set();
  };

  const handleKeyDown = (action, e) => {
    if (recordingAction !== action || editingAction !== action) return;

    e.preventDefault();
    e.stopPropagation();

    // Allow clearing current draft while staying in edit mode.
    if (e.key === 'Backspace' || e.key === 'Delete') {
      pressedKeysRef.current = new Set();
      setDraftByAction((prev) => ({ ...prev, [action]: [] }));
      setErrorByAction((prev) => ({
        ...prev,
        [action]: { code: ERROR.EMPTY, message: `Shortcut can't be empty.` }
      }));
      return;
    }

    // Ignore key repeat so holding a key does not cause noise.
    if (e.repeat) return;

    const keyName = normalizeKey(e);
    if (!keyName) return;

    // Record all currently pressed keys.
    // This supports 2-key, 3-key, and larger simultaneous combos.
    pressedKeysRef.current.add(keyName);

    const nextDraft = uniqSorted(Array.from(pressedKeysRef.current));

    setDraftByAction((prev) => ({
      ...prev,
      [action]: nextDraft
    }));

    const err = validateCombo(action, nextDraft);
    setErrorByAction((prev) => {
      const next = { ...prev };

      if (err) {
        next[action] = err;
      } else {
        delete next[action];
      }

      return next;
    });
  };

  const handleKeyUp = (action, e) => {
    if (recordingAction !== action || editingAction !== action) return;

    e.preventDefault();
    e.stopPropagation();

    const keyName = normalizeKey(e);
    if (!keyName) return;

    pressedKeysRef.current.delete(keyName);

    // Commit once the whole combination has been released.
    // This matches how editors typically record shortcuts.
    if (pressedKeysRef.current.size === 0) {
      const currentDraft = draftByAction[action] || [];

      // If empty, keep editing.
      if (currentDraft.length === 0) return;

      // If invalid, keep editing so user can try again.
      if (errorByAction[action]?.message) return;

      stopEditing(action);
    }
  };

  const renderValue = (action) => {
    const binding = keyBindings[action];

    // Use displayValue for special combined labels when present.
    if (binding?.displayValue) {
      if (typeof binding.displayValue === 'string') {
        return binding.displayValue;
      }

      return binding.displayValue[os] || binding.displayValue.mac || binding.displayValue.windows;
    }

    const arr
      = recordingAction === action
        ? draftByAction[action]
        : fromKeysString(getCurrentRowKeysString(action));

    return (arr || []).join(' + ');
  };

  return (
    <StyledWrapper className="w-full">
      <div className="section-header">
        <span>Keybindings</span>

        {hasDirtyRows && (
          <button
            type="button"
            className="reset-all-btn"
            onClick={resetAllKeybindings}
            title="Reset all keybindings to default"
          >
            <IconReload size={14} stroke={1.5} />
          </button>
        )}
      </div>

      <div className="tables-container">
        {groupedKeyMappings.length > 0 ? (
          groupedKeyMappings.map((section) => (
            <div className="group-block" key={section.heading}>
              <div className="group-heading">{section.heading}</div>

              <div className="table-container">
                <table>
                  {/* <thead>
                    <tr>
                      <th>Command</th>
                      <th>Keybinding</th>
                    </tr>
                  </thead> */}

                  <tbody>
                    {section.rows.map((row) => {
                      const { action } = row;
                      const isEditing = editingAction === action;
                      const isHovered = hoveredAction === action;
                      const isDirty = isRowDirty(action);
                      const isReadOnly = row?.readOnly === true;

                      const showPencil = isHovered && !isEditing && !isDirty && !isReadOnly;
                      const showRefresh = isDirty && !isEditing;
                      const showLock = isHovered && isReadOnly && !isEditing;

                      const hasError = Boolean(errorByAction[action]?.message);
                      const errorMessage = errorByAction[action]?.message;
                      const inputId = `kb-input-${action}`;

                      return (
                        <tr
                          key={action}
                          data-testid={`keybinding-row-${action}`}
                          onMouseEnter={() => setHoveredAction(action)}
                          onMouseLeave={() =>
                            setHoveredAction((prev) => (prev === action ? null : prev))}
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
                                  disabled={isReadOnly}
                                  readOnly={!isEditing || isReadOnly}
                                  onKeyDown={(e) => (isReadOnly ? null : handleKeyDown(action, e))}
                                  onKeyUp={(e) => (isReadOnly ? null : handleKeyUp(action, e))}
                                  onBlur={() => {
                                    // If the user blurs with an invalid draft, discard it and restore persisted value.
                                    if (isEditing && hasError) {
                                      cancelEditing(action);
                                    } else if (isEditing) {
                                      stopEditing(action);
                                    }
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
                                    className="tooltip-mod tooltip-mod--error"
                                  />
                                )}
                              </div>

                              <div className="button-placeholder">
                                {showRefresh && (
                                  <button
                                    type="button"
                                    className="reset-btn"
                                    data-testid={`keybinding-reset-${action}`}
                                    onClick={() => resetRowToDefault(action)}
                                    title="Reset to default"
                                  >
                                    <IconReload size={14} stroke={1.5} />
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
                                    <IconPencil size={14} stroke={1.5} />
                                  </button>
                                )}

                                {showLock && (
                                  <button
                                    type="button"
                                    className="edit-btn"
                                    data-testid={`keybinding-locked-${action}`}
                                    title="Read-only shortcut"
                                  >
                                    <IconLock size={14} stroke={1.5} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">No key bindings available</div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default Keybindings;
