import { useEffect, useRef } from 'react';
import { isMacOS } from 'utils/common/platform';

const isTextField = (el) => el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable;

/**
 * Keyboard shortcuts for the environments list. They are active only while focus is inside the
 * element that receives `scopeRef`.
 */
const useEnvironmentShortcuts = ({
  hasSelection,
  isOverlayOpen,
  onClearSelection,
  onSelectAll,
  onDelete
}) => {
  const scopeRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // While a modal or menu is open every key belongs to it.
      if (isOverlayOpen) return;
      // return if focus is not inside the env sidebar list, and leave typing in inputs (like inline rename) alone.
      if (!scopeRef.current?.contains(document.activeElement) || isTextField(document.activeElement)) return;

      if (e.key === 'Escape') {
        if (hasSelection) onClearSelection();
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
      } else if (isDeleteShortcut && hasSelection) {
        e.preventDefault();
        onDelete();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOverlayOpen, hasSelection, onClearSelection, onSelectAll, onDelete]);

  return { scopeRef };
};

export default useEnvironmentShortcuts;
