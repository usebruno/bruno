import React, { useRef, useEffect } from 'react';
import find from 'lodash/find';
import Mousetrap from 'mousetrap';
import { useSelector, useDispatch } from 'react-redux';
import {
  saveRequest,
  saveCollectionRoot,
  saveFolderRoot,
  saveCollectionSettings
} from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, findItemInCollection } from 'utils/collections';
import { getKeyBindingsForActionAllOS } from './keyMappings';

import commandRegistry from '../../services/command-registry';
import whenClauseResolver from '../../services/when-clause-resolver';
import CommandInitializer from './CommandInitializer';

export const HotkeysContext = React.createContext();

// List of all actions that are bound in this provider
const BOUND_ACTIONS = [
  'save',
  'saveAllTabs',
  'sendRequest',
  'closeTab'
];

/**
 * Bind a single hotkey action using Mousetrap.
 * Reads from merged defaults + user preferences via getKeyBindingsForActionAllOS.
 * Supports when clauses for context-aware execution.
 */
function bindHotkey(action, handler, userKeyBindings) {
  const combos = getKeyBindingsForActionAllOS(action, userKeyBindings);
  if (!combos?.length) return;

  Mousetrap.bind([...combos], (e) => {
    e?.preventDefault?.();

    // Get when clause from command metadata
    const metadata = commandRegistry.getMetadata(action);
    const whenClause = metadata?.when || 'always';

    // Evaluate when clause before executing
    if (whenClauseResolver.evaluate(whenClause)) {
      handler(e);
    }
    return false;
  });
}

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
  console.log('[Hotkeys] bindAllHotkeys called', userKeyBindings);

  BOUND_ACTIONS.forEach((action) => {
    const combos = getKeyBindingsForActionAllOS(action, userKeyBindings);
    console.log('[Hotkeys] combos for', action, ':', combos);

    if (!combos?.length) {
      return;
    }

    console.log('[Hotkeys] Binding Mousetrap for', action);

    Mousetrap.bind([...combos], (e) => {
      console.log('[Hotkeys] Key pressed:', action);

      // Check if user is typing in an input field - let default browser behavior work
      const target = e.target || document.activeElement;
      const isInputField = target?.closest('.mousetrap')
        || target?.tagName === 'INPUT'
        || target?.tagName === 'TEXTAREA'
        || target?.getAttribute('contenteditable') === 'true';

      console.log('[Hotkeys] isInputField:', isInputField, 'target:', target?.tagName); // Check if there's text selected anywhere - let browser handle copy/paste
      const hasSelection = window.getSelection()?.toString()?.length > 0;

      // For copy/paste actions (Ctrl+C, Ctrl+V), check if we should handle or let browser do it
      const isCopyPasteAction = action === 'copyItem' || action === 'pasteItem';
      const isSaveAction = action === 'save' || action === 'saveAllTabs';
      const isSendRequestAction = action === 'sendRequest';

      // Get when clause from command metadata for context-aware execution
      const metadata = commandRegistry.getMetadata(action);
      console.log('[Hotkeys] metadata:', metadata);

      const whenClause = metadata?.when || 'always';
      console.log('[Hotkeys] whenClause:', whenClause);

      const whenClausePasses = whenClauseResolver.evaluate(whenClause);
      console.log('[Hotkeys] whenClausePasses:', whenClausePasses);

      // If in input field OR has text selected, OR when clause doesn't pass for copy/paste
      // -> Let browser handle it (this allows native Ctrl+C/V to work)
      if ((isInputField && !isSaveAction && !isSendRequestAction) || hasSelection || (isCopyPasteAction && !whenClausePasses)) {
        return true; // Let default behavior happen (Copy/Paste/Cut/SelectAll)
      }

      // Not in input field and when clause passes - execute our custom command
      e?.preventDefault?.();

      // Evaluate when clause - if false, don't execute
      if (!whenClausePasses) {
        return false;
      }

      // Execute the command by ID - Implementation is in CommandInitializer!
      console.log('[Hotkeys] Executing command:', action);
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
  const prevKeyBindingsRef = useRef(undefined);

  // Update whenClauseResolver with active tab type when it changes
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const tabs = useSelector((state) => state.tabs.tabs);

  useEffect(() => {
    if (activeTabUid && tabs?.length) {
      const activeTab = tabs.find((t) => t.uid === activeTabUid);
      if (activeTab) {
        whenClauseResolver.setActiveTabType(activeTab.type);
        console.log('[Hotkeys] Active tab type set to:', activeTab.type);
      }
    }
  }, [activeTabUid, tabs]);

  // Bind/rebind hotkeys whenever user preferences change
  useEffect(() => {
    // Store previous bindings before updating
    const prevBindings = prevKeyBindingsRef.current;

    // Unbind previous bindings (if any)
    if (prevBindings !== undefined) {
      unbindAllHotkeys(prevBindings);
    }

    // Bind with current preferences
    bindAllHotkeys(userKeyBindings);
    prevKeyBindingsRef.current = userKeyBindings;

    return () => {
      // Cleanup on unmount
      unbindAllHotkeys(userKeyBindings);
    };
  }, [userKeyBindings]);

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
