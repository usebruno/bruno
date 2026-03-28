import React, { useRef, useEffect } from 'react';
import Mousetrap from 'mousetrap';
import { useSelector } from 'react-redux';
import { getKeyBindingsForActionAllOS } from './keyMappings';

import commandRegistry from '../../services/command-registry';
import whenClauseResolver from '../../services/when-clause-resolver';
import CommandInitializer from './CommandInitializer';

export const HotkeysContext = React.createContext();

// List of all actions that are bound in this provider
const BOUND_ACTIONS = [
  // ===== TABS =====
  'save',
  'saveAllTabs',
  'sendRequest',
  'closeTab',
  'closeAllTabs',
  'switchToPreviousTab',
  'switchToNextTab',
  'moveTabLeft',
  'moveTabRight',
  // ===== Switch to tab at position 1-8 =====
  'switchToTab1',
  'switchToTab2',
  'switchToTab3',
  'switchToTab4',
  'switchToTab5',
  'switchToTab6',
  'switchToTab7',
  'switchToTab8',
  'switchToLastTab',
  'reopenLastClosedTab',
  // ===== Terminal =====
  'openTerminal',
  // ===== SIDEBAR =====
  'sidebarSearch',
  'newRequest', // Will only be modal for now not transient request
  'renameItem',
  'cloneItem',
  'copyItem',
  'pasteItem',
  // ===== LAYOUT =====
  'changeLayout',
  'openPreferences',
  'closeBruno',
  // ===== ZOOM =====
  'zoomIn',
  'zoomOut',
  'resetZoom',
  // ===== COLLECTIONS =====
  'importCollection',
  'editEnvironment',
  'collapseSidebar',
  'globalSearch'
];

/**
 * Unbind a single hotkey action.
 */
function unbindHotkey(action, userKeyBindings) {
  const combos = getKeyBindingsForActionAllOS(action, userKeyBindings);
  if (!combos?.length) return;
  Mousetrap.unbind([...combos]);
}

/**
 * Unbind all known actions for the given user key bindings.
 */
function unbindAllHotkeys(userKeyBindings) {
  BOUND_ACTIONS.forEach((action) => unbindHotkey(action, userKeyBindings));
}

/**
 * Bind all hotkey actions.
 *
 * This is a GENERIC DISPATCHER that executes registered commands.
 * Supports when clauses for context-aware keybinding execution.
 *
 * All business logic has been extracted to CommandInitializer.
 */
function bindAllHotkeys(userKeyBindings) {
  BOUND_ACTIONS.forEach((action) => {
    const combos = getKeyBindingsForActionAllOS(action, userKeyBindings);

    if (!combos?.length) {
      return;
    }

    Mousetrap.bind([...combos], (e) => {
      const target = e.target || document.activeElement;
      const isInCodeMirror = !!target?.closest('.CodeMirror');
      const isInputField = !isInCodeMirror && (
        target?.tagName === 'INPUT'
        || target?.tagName === 'TEXTAREA'
        || target?.getAttribute('contenteditable') === 'true'
      );
      const hasSelection = !isInCodeMirror && window.getSelection()?.toString()?.length > 0;

      const metadata = commandRegistry.getMetadata(action);
      const whenClause = metadata?.when || 'always';
      const scope = metadata?.scope || 'sidebar';
      const whenClausePasses = whenClauseResolver.evaluate(whenClause);

      // --- Scope-based routing ---

      if (scope === 'global') {
        // Always execute, regardless of input focus
        if (!whenClausePasses) return false;
        e?.preventDefault?.();
        commandRegistry.execute(action);
        return false;
      }

      if (scope === 'passthrough') {
        // If in input, has selection, or when-clause fails → let browser handle it
        if (isInputField || hasSelection || !whenClausePasses) return true;
        e?.preventDefault?.();
        commandRegistry.execute(action);
        return false;
      }

      // scope === 'sidebar' (default)
      // Blocked in input fields, requires when-clause
      if (isInputField || hasSelection) return true;
      if (!whenClausePasses) return false;
      e?.preventDefault?.();
      commandRegistry.execute(action);
      return false;
    });
  });
}

// -----------------------
// Provider (manages hotkey lifecycle)
// -----------------------
export const HotkeysProvider = (props) => {
  const preferences = useSelector((state) => state.app.preferences);
  const userKeyBindings = preferences?.keyBindings || {};
  const keybindingsEnabled = preferences?.keybindingsEnabled !== false;
  const prevKeyBindingsRef = useRef(undefined);

  // Update whenClauseResolver with active tab type when it changes
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const tabs = useSelector((state) => state.tabs.tabs);
  const sidebarItemFocused = useSelector((state) => state.app.sidebarItemFocused);

  useEffect(() => {
    if (activeTabUid && tabs?.length) {
      const activeTab = tabs.find((t) => t.uid === activeTabUid);
      if (activeTab) {
        whenClauseResolver.setActiveTabType(activeTab.type);
      }
    }
    // Also update tabs count
    whenClauseResolver.setTabsCount(tabs?.length || 0);
  }, [activeTabUid, tabs]);

  // Sync sidebarItemFocused to whenClauseResolver
  useEffect(() => {
    whenClauseResolver.setSidebarItemFocused(sidebarItemFocused);
  }, [sidebarItemFocused]);

  // Bind/rebind hotkeys whenever user preferences or enabled state changes
  useEffect(() => {
    // Store previous bindings before updating
    const prevBindings = prevKeyBindingsRef.current;

    // Unbind previous bindings (if any)
    if (prevBindings !== undefined) {
      unbindAllHotkeys(prevBindings);
    }

    // Only bind if keybindings are enabled
    if (keybindingsEnabled) {
      bindAllHotkeys(userKeyBindings);
    }
    prevKeyBindingsRef.current = userKeyBindings;

    return () => {
      // Cleanup on unmount
      unbindAllHotkeys(userKeyBindings);
    };
  }, [userKeyBindings, keybindingsEnabled]);

  return (
    <HotkeysContext.Provider {...props} value="hotkey">
      <CommandInitializer />
      <div>{props.children}</div>
    </HotkeysContext.Provider>
  );
};

export const useHotkeys = () => {
  const context = React.useContext(HotkeysContext);

  if (!context) {
    throw new Error(`useHotkeys must be used within a HotkeysProvider`);
  }

  return context;
};

export default HotkeysProvider;
