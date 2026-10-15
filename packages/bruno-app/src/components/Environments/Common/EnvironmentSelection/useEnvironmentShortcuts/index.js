import { useEffect, useRef } from 'react';
import { isMacOS } from 'utils/common/platform';

const isTextField = (el) => el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable;

/**
 * Keyboard shortcuts for the environments list. They are active only while focus is inside the
 * element that receives `scopeRef`, or while one of the list's menus is open (its portal sits outside
 * the list). Modals block them, and an open menu keeps Escape for itself.
 */
const useEnvironmentShortcuts = ({
  hasSelection,
  isModalOpen,
  isMenuOpen,
  onClearSelection,
  onSelectAll,
  onDelete
}) => {
  const scopeRef = useRef(null);
  const wasModalOpenRef = useRef(false);

  // Closing a modal drops focus to <body>, which is outside the list. Hand it back so the shortcuts keep working.
  useEffect(() => {
    if (wasModalOpenRef.current && !isModalOpen) {
      const active = document.activeElement;
      if (!active || active === document.body) scopeRef.current?.focus();
    }
    wasModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // While a modal is open every key belongs to it.
      if (isModalOpen) return;
      // return if focus is not inside the env sidebar list (or one of its open menus), and leave typing in inputs (like inline rename) alone.
      const isFocusInScope = scopeRef.current?.contains(document.activeElement) || isMenuOpen;
      if (!isFocusInScope || isTextField(document.activeElement)) return;

      if (e.key === 'Escape') {
        if (hasSelection && !isMenuOpen) onClearSelection();
        return;
      }

      const isMac = isMacOS();
      const hasPlatformModifierOnly = !e.shiftKey && !e.altKey && (isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey);
      const hasNoModifier = !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey;

      const isSelectAllShortcut = hasPlatformModifierOnly && e.key.toLowerCase() === 'a';
      const isDeleteShortcut = isMac
        ? hasPlatformModifierOnly && (e.key === 'Backspace' || e.key === 'Delete')
        : hasNoModifier && e.key === 'Delete';

      if (isSelectAllShortcut) {
        e.preventDefault();
        onSelectAll();
      } else if (isDeleteShortcut && (hasSelection || isMenuOpen)) {
        e.preventDefault();
        onDelete();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isMenuOpen, hasSelection, onClearSelection, onSelectAll, onDelete]);

  return { scopeRef };
};

export default useEnvironmentShortcuts;
