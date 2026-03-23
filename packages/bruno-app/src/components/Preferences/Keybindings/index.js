import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';

import StyledWrapper from './StyledWrapper';
import { IconReload, IconPencil, IconLock, IconCircleCheck, IconAlertCircle } from '@tabler/icons';
import { isMacOS } from 'utils/common/platform';

import { savePreferences } from 'providers/ReduxStore/slices/app';
import { KEY_BINDING_SECTIONS } from 'providers/Hotkeys/keyMappings.js';
import { Tooltip } from 'react-tooltip';
import ToggleSwitch from 'components/ToggleSwitch/index';

const SEP = '+bind+';
const getOS = () => (isMacOS() ? 'mac' : 'windows');

// Modifier tokens used in stored preferences.
// These are lowercase on purpose so they match persisted values.
const MODIFIERS = new Set(['ctrl', 'command', 'alt', 'shift']);

const MODIFIER_SYMBOLS = {
  mac: {
    command: '⌘',
    ctrl: '⌃',
    alt: '⌥',
    shift: '⇧'
  },
  windows: {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    command: 'Win'
  }
};

// Helper to parse displayValue string into arrays of key arrays for rendering as keycaps
// Takes a raw string like "command+bind+1 - command+bind+8" and returns [["command", "1"], ["command", "8"]]
// This allows rendering in the same pills style as regular keybindings
const parseDisplayValue = (displayValue, os) => {
  if (!displayValue || typeof displayValue !== 'string') return null;

  const symbols = MODIFIER_SYMBOLS[os] || MODIFIER_SYMBOLS.windows;

  // Reverse mapping from symbol to key name
  const symbolToKey = {};
  Object.entries(symbols).forEach(([key, symbol]) => {
    symbolToKey[symbol.toLowerCase()] = key;
  });

  // Split by " - " to get range parts (e.g., ["command+bind+1", "command+bind+8"])
  const rangeParts = displayValue.split(/\s*-\s*/);

  const result = rangeParts.map((part) => {
    // Split by "+bind+" to get individual keys (consistent with storage format)
    // Filter out empty strings that may result from the split
    const keys = part.split(SEP).filter(Boolean).map((key) => {
      const lowerKey = key.toLowerCase().trim();
      // Check if it's a symbol and convert back to key name
      if (symbolToKey[lowerKey]) {
        return symbolToKey[lowerKey];
      }
      // For non-modifier keys, return as-is but lowercase
      return lowerKey;
    });
    return keys;
  });

  return result;
};

// Render displayValue using the same pills style as regular keybindings
const renderDisplayValue = (displayValue, os) => {
  const parsed = parseDisplayValue(displayValue, os);
  if (!parsed || !parsed.length) return null;

  // If there's only one shortcut, render it normally
  if (parsed.length === 1) {
    return <span className="shortcut-pills">{renderKeycaps(parsed[0], os)}</span>;
  }

  // If there are multiple shortcuts (range), render each as a group with separator
  return (
    <span className="shortcut-pills">
      {parsed.map((keysArr, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="shortcut-separator"> - </span>}
          {renderKeycaps(keysArr, os)}
        </React.Fragment>
      ))}
    </span>
  );
};

// Required modifier policy by OS.
// On macOS, command/ctrl/alt/shift are allowed as the required modifier.
// On Windows, command should not count as a valid modifier for app shortcuts.
const REQUIRED_MODIFIERS_BY_OS = {
  mac: new Set(['command', 'alt', 'shift', 'ctrl']),
  windows: new Set(['ctrl', 'alt', 'shift'])
};

const FUNCTION_KEY_PATTERN = /^f([1-9]|1[0-2])$/;
const isFunctionKey = (k) => FUNCTION_KEY_PATTERN.test(k);
const hasRequiredModifier = (os, arr) => {
  // Function keys (F1-F12) are allowed without a modifier
  if (arr.some(isFunctionKey)) return true;
  return arr.some((k) => REQUIRED_MODIFIERS_BY_OS[os]?.has(k));
};
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

const formatSingleKeyForDisplay = (key, os) => {
  if (MODIFIER_SYMBOLS[os]?.[key]) return MODIFIER_SYMBOLS[os][key];
  if (key.length === 1) return key.toUpperCase();

  const SPECIAL_LABELS = {
    enter: os === 'mac' ? '↩' : 'Enter',
    backspace: os === 'mac' ? '⌫' : 'Backspace',
    tab: os === 'mac' ? '⇥' : 'Tab',
    delete: os === 'mac' ? '⌦' : 'Delete',
    esc: os === 'mac' ? '⎋' : 'Esc',
    space: os === 'mac' ? '␣' : 'Space',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    pageup: 'PageUp',
    pagedown: 'PageDown',
    home: 'Home',
    end: 'End'
  };

  return SPECIAL_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

const renderKeycaps = (keysArr, os) => {
  if (!keysArr?.length) return null;

  return keysArr.map((key, index) => (
    <span key={`${key}-${index}`} className="keycap">
      {formatSingleKeyForDisplay(key, os)}
    </span>
  ));
};

// Signature is intentionally exact.
// This means:
// - command + f
// - command + shift + f
// are treated as different shortcuts and can coexist.
// Only an exact same normalized combo is considered duplicate.
const comboSignature = (arr) => toKeysString(arr);

// OS reserved shortcuts in stored-token format.
// These are blocked because they are usually intercepted by the OS/window manager.
// Also includes common editing shortcuts that should not be overridden.
const RESERVED_BY_OS = {
  mac: new Set([
    comboSignature(['command', 'h']),
    comboSignature(['command', 'alt', 'h']),
    comboSignature(['ctrl', 'command', 'f']),
    comboSignature(['command', 'shift', 'q']),
    comboSignature(['command', 'alt', 'd']),
    comboSignature(['command', 'm']),
    comboSignature(['command', 'tab']),
    comboSignature(['command', 'space']),
    comboSignature(['ctrl', 'command', 'q']),
    comboSignature(['command', 'shift', '3']),
    comboSignature(['command', 'shift', '4']),
    comboSignature(['command', 'shift', '5']),
    comboSignature(['command', 'alt', 'esc']),
    // Undo/Redo - standard text editing shortcuts that browsers handle natively
    comboSignature(['command', 'z']),
    comboSignature(['command', 'shift', 'z']),
    comboSignature(['command', 'alt', 'z']),
    // Toggle Developer Tools
    comboSignature(['command', 'alt', 'i']),
    // Function keys reserved by macOS
    comboSignature(['f11']), // Show Desktop
    comboSignature(['f12']) // Dashboard (older macOS)
  ]),
  windows: new Set([
    comboSignature(['alt', 'tab']),
    comboSignature(['alt', 'f4']),
    comboSignature(['f1']), // Windows Help
    comboSignature(['ctrl', 'alt', 'delete']),
    comboSignature(['command', 'l']),
    comboSignature(['command', 'd']),
    comboSignature(['command', 'e']),
    comboSignature(['command', 'r']),
    comboSignature(['command', 'i']),
    comboSignature(['command', 's']),
    comboSignature(['command', 'a']),
    comboSignature(['command', 'x']),
    comboSignature(['command', 'm']),
    comboSignature(['command', 'tab']),
    comboSignature(['ctrl', 'shift', 'esc']),
    // Undo/Redo - standard text editing shortcuts that browsers handle natively
    comboSignature(['ctrl', 'z']),
    comboSignature(['ctrl', 'shift', 'z']),
    // Toggle Developer Tools
    comboSignature(['ctrl', 'shift', 'i'])
  ])
};

// Normalize keyboard event to stored token format.
// The output must stay aligned with default preference values.
const normalizeKey = (e) => {
  const k = e.key;

  // Handle dead keys on macOS - Option+letter produces dead key characters
  // Convert dead key back to the base character for consistent normalization
  if (k === 'Dead') {
    // Use code to determine the base key (e.g., 'KeyI' for 'i')
    const code = e.code;
    if (code) {
      const baseKey = code.replace('Key', '').toLowerCase();
      return baseKey;
    }
    return 'dead';
  }

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

  // For letter and digit keys always use e.code (the physical key) instead of e.key.
  // When Option/Alt is held, e.key produces a composed character (e.g. Option+X → '≈')
  // which Mousetrap does not recognise — it expects the base key name ('x').
  // e.code is unaffected by modifier state: 'KeyX' → 'x', 'Digit1' → '1'.
  const code = e.code || '';
  if (code.startsWith('Key')) return code.slice(3).toLowerCase();
  if (code.startsWith('Digit')) return code.slice(5);

  // Single printable chars become lowercase.
  if (k.length === 1) return k.toLowerCase();

  // ArrowUp -> arrowup, PageUp -> pageup, etc.
  return k.toLowerCase();
};

const ERROR = {
  EMPTY: 'EMPTY',
  ONLY_MODIFIERS: 'ONLY_MODIFIERS',
  MISSING_REQUIRED_MOD: 'MISSING_REQUIRED_MOD',
  MULTIPLE_NON_MODIFIERS: 'MULTIPLE_NON_MODIFIERS',
  RESERVED: 'RESERVED',
  DUPLICATE: 'DUPLICATE'
};

const Keybindings = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const { theme } = useTheme();

  const os = getOS();
  const keybindingsEnabled = preferences?.keybindingsEnabled !== false;

  const handleToggleKeybindings = () => {
    const updatedPreferences = {
      ...preferences,
      keybindingsEnabled: !keybindingsEnabled
    };
    dispatch(savePreferences(updatedPreferences));
  };

  // Flatten KEY_BINDING_SECTIONS into a single lookup map for internal logic.
  const sectionDefaults = useMemo(() => {
    const merged = {};

    for (const section of KEY_BINDING_SECTIONS) {
      for (const [action, binding] of Object.entries(section.bindings || {})) {
        merged[action] = { ...binding };
      }
    }

    return merged;
  }, []);

  // Source of truth:
  // Start from grouped defaults, then merge user-specific overrides on top.
  const keyBindings = useMemo(() => {
    const merged = {};

    for (const [action, binding] of Object.entries(sectionDefaults)) {
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
  }, [preferences?.keyBindings, sectionDefaults]);

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

  // successAction:
  // Tracks which row just saved successfully for a 1-second flash.
  const [successAction, setSuccessAction] = useState(null);
  const successTimerRef = useRef(null);

  const getCurrentRowKeysString = (action) => keyBindings?.[action]?.[os] || '';
  const getDefaultRowKeysString = (action) => sectionDefaults?.[action]?.[os] || '';

  const isRowDirty = (action) => {
    const current = getCurrentRowKeysString(action);
    const def = getDefaultRowKeysString(action);

    if (!sectionDefaults[action]) return false;
    return current !== def;
  };

  // Whether any row differs from the default binding.
  const hasDirtyRows = useMemo(() => {
    for (const action of Object.keys(sectionDefaults)) {
      if (isRowDirty(action)) {
        return true;
      }
    }
    return false;
  }, [keyBindings, os, sectionDefaults]);

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

    const nonModifierCount = arr.filter((k) => !MODIFIERS.has(k)).length;
    if (nonModifierCount > 1) {
      return {
        code: ERROR.MULTIPLE_NON_MODIFIERS,
        message: 'Only one non-modifier key allowed (e.g. Cmd + Shift + K).'
      };
    }

    if (RESERVED_BY_OS[os]?.has(sig)) {
      return {
        code: ERROR.RESERVED,
        message: 'This shortcut is reserved by the OS.'
      };
    }

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
          name: preferences?.keyBindings?.[action]?.name || sectionDefaults?.[action]?.name || action,
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

    return true;
  };

  const resetRowToDefault = (action) => {
    const def = sectionDefaults?.[action]?.[os];
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
    if (!keybindingsEnabled) return;
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
  };

  // Focus the input div after React has committed the editingAction state change.
  // Runs only when editingAction changes — no extra renders beyond what already happens.
  useEffect(() => {
    if (editingAction) {
      inputRefs.current[editingAction]?.focus?.();
    }
  }, [editingAction]);

  const showSuccessFlash = (action) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccessAction(action);
    successTimerRef.current = setTimeout(() => {
      setSuccessAction(null);
      successTimerRef.current = null;
    }, 800);
  };

  const stopEditing = (action) => {
    const draftArr = draftByAction[action] || [];
    const currentKeys = getCurrentRowKeysString(action);
    const nextKeys = draftArr.length ? toKeysString(draftArr) : currentKeys;
    const willChange = nextKeys !== currentKeys;

    const ok = commitCombo(action);

    if (!ok) {
      // On invalid commit, discard the invalid draft and restore saved value.
      cancelEditing(action);
      return;
    }

    setRecordingAction(null);
    setEditingAction(null);
    pressedKeysRef.current = new Set();

    if (willChange) {
      showSuccessFlash(action);
    }
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

    // Starting a new combo after a failed one — clear stale draft
    if (pressedKeysRef.current.size === 0 && errorByAction[action]?.message) {
      setDraftByAction((prev) => ({ ...prev, [action]: [] }));
      setErrorByAction((prev) => {
        const next = { ...prev };
        delete next[action];
        return next;
      });
    }

    // Max 3 keys allowed per keybinding
    if (pressedKeysRef.current.size >= 3 && !pressedKeysRef.current.has(keyName)) return;

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

    const currentDraft = draftByAction[action] || [];

    // If empty, keep editing.
    if (currentDraft.length === 0) return;

    // If invalid, keep the draft visible but mark for reset on next keypress.
    if (errorByAction[action]?.message) return;

    // Commit as soon as the draft is valid, regardless of how many keys are still held.
    // On macOS, keyup events for non-Meta keys are swallowed when Cmd is held, so
    // pressedKeysRef.size may never reach 0 — committing on any keyup fixes this.
    stopEditing(action);
  };

  const renderValue = (action) => {
    const binding = keyBindings[action];

    if (binding?.displayValue) {
      // Use the same pills style rendering as regular keybindings
      if (typeof binding.displayValue === 'string') {
        return <span className="shortcut-text">{renderDisplayValue(binding.displayValue, os)}</span>;
      }

      // displayValue can be an object with OS-specific values
      const rawDisplayText = binding.displayValue[os] || binding.displayValue.mac || binding.displayValue.windows;
      return <span className="shortcut-text">{renderDisplayValue(rawDisplayText, os)}</span>;
    }

    const isRecording = recordingAction === action;
    const arr = isRecording
      ? draftByAction[action]
      : fromKeysString(getCurrentRowKeysString(action));

    if (isRecording) {
      const textParts = (arr || []).map((key) => formatSingleKeyForDisplay(key, os));
      return (
        <span className="shortcut-text">
          {textParts.join(' ')}
          <span className="editing-caret" />
        </span>
      );
    }

    return renderKeycaps(arr || [], os);
  };

  return (
    <StyledWrapper className="w-full">
      <div className="section-header">
        <span>Keybindings</span>

        <div className="section-actions">
          <ToggleSwitch
            isOn={keybindingsEnabled}
            handleToggle={handleToggleKeybindings}
            size="2xs"
            activeColor={theme.primary.solid}
          />
          <div className="section-actions-divider" />
          <button
            onClick={resetAllKeybindings}
            className="reset-btn"
          >
            Reset Default
          </button>
        </div>
      </div>

      <div className={`tables-container ${!keybindingsEnabled ? 'tables-disabled' : ''}`}>
        {groupedKeyMappings.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <td>Command</td>
                  <td>Keybinding</td>
                </tr>
              </thead>
              <tbody>
                {groupedKeyMappings.map((section, sectionIndex) => (
                  <React.Fragment key={section.heading}>
                    <tr className="section-heading-row">
                      <td colSpan={2}>{section.heading}</td>
                    </tr>
                    {section.rows.map((row, rowIndex) => {
                      const { action } = row;
                      const isEditing = editingAction === action;
                      const isHovered = hoveredAction === action;
                      const isDirty = isRowDirty(action);
                      const isReadOnly = row?.readOnly === true;

                      const isSuccess = successAction === action;
                      const hasError = Boolean(errorByAction[action]?.message);
                      const errorMessage = errorByAction[action]?.message;

                      const showPencil = isHovered && !isDirty && !isEditing && !isReadOnly && !isSuccess && !hasError;
                      const showRefresh = isDirty && !isEditing && !isSuccess && !hasError;
                      const showLock = isHovered && isReadOnly && !isEditing && !isSuccess;
                      const inputId = `kb-input-${action}`;

                      const isLastInSection = rowIndex === section.rows.length - 1
                        && sectionIndex < groupedKeyMappings.length - 1;

                      return (
                        <tr
                          key={action}
                          className={`${isSuccess ? 'row-success' : ''} ${isEditing ? 'row-editing' : ''} ${isLastInSection ? 'section-last-row' : ''}`}
                          data-testid={`keybinding-row-${action}`}
                          onMouseEnter={() => setHoveredAction(action)}
                          onMouseLeave={() =>
                            setHoveredAction((prev) => (prev === action ? null : prev))}
                          onClick={() => !isReadOnly && !isEditing && startEditing(action)}
                        >
                          <td data-testid={`keybinding-name-${action}`}>{row.name}</td>

                          <td>
                            <div className="keybinding-row">
                              <div className="shortcut-wrap">
                                <div
                                  id={inputId}
                                  ref={(el) => {
                                    if (el) inputRefs.current[action] = el;
                                  }}
                                  data-testid={`keybinding-input-${action}`}
                                  className={`shortcut-input ${hasError && errorByAction[action]?.code !== ERROR.EMPTY ? 'shortcut-input--error' : ''} ${isEditing ? 'shortcut-input--editing' : ''
                                  } ${isReadOnly ? 'shortcut-input--readonly' : ''}`}
                                  tabIndex={isReadOnly ? -1 : 0}
                                  role="textbox"
                                  aria-readonly={!isEditing || isReadOnly}
                                  aria-disabled={isReadOnly}
                                  onKeyDown={(e) => (isReadOnly ? null : handleKeyDown(action, e))}
                                  onKeyUp={(e) => (isReadOnly ? null : handleKeyUp(action, e))}
                                  onBlur={() => {
                                    if (isEditing && hasError) {
                                      cancelEditing(action);
                                    } else if (isEditing) {
                                      stopEditing(action);
                                    }
                                  }}
                                >
                                  {renderValue(action)}
                                  {hasError && errorByAction[action]?.code !== ERROR.EMPTY && (
                                    <span className="input-error-icon">
                                      <IconAlertCircle size={14} stroke={1.5} />
                                    </span>
                                  )}
                                </div>

                                {isEditing && hasError && errorByAction[action]?.code !== ERROR.EMPTY && (
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

                              {!isEditing && (
                                <div className="button-placeholder">
                                  {isSuccess && !hasError && (
                                    <span className="success-icon">
                                      <IconCircleCheck size={14} stroke={1.5} />
                                    </span>
                                  )}

                                  {showRefresh && !hasError && (
                                    <button
                                      className="action-btn"
                                      data-testid={`keybinding-reset-${action}`}
                                      onClick={(e) => {
                                        e.stopPropagation(); resetRowToDefault(action);
                                      }}
                                      title="Reset to default"
                                    >
                                      <IconReload size={14} stroke={1.5} />
                                    </button>
                                  )}

                                  {showPencil && (
                                    <span
                                      className="pencil-icon"
                                      data-testid={`keybinding-edit-${action}`}
                                      title="Customize keys"
                                    >
                                      <IconPencil size={14} stroke={1.5} />
                                    </span>
                                  )}

                                  {showLock && (
                                    <button
                                      type="button"
                                      className="edit-btn"
                                      data-testid={`keybinding-locked-${action}`}
                                      title="Reserved shortcut"
                                    >
                                      <IconLock size={14} stroke={1.5} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No key bindings available</div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default Keybindings;
