import { useEffect, useRef } from 'react';
import { isMacOS } from 'utils/common/platform';

const useEnvironmentShortcuts = ({
  hasSelection,
  isAnyModalOpen,
  onEscape,
  onSelectAll,
  onDelete
}) => {
  const scopeRef = useRef(null);
  const wasModalOpenRef = useRef(false);

  // A closing modal takes its focus with it. Hand focus back to the list so the shortcuts keep working.
  useEffect(() => {
    if (wasModalOpenRef.current && !isAnyModalOpen) {
      scopeRef.current?.focus({ preventScroll: true });
    }
    wasModalOpenRef.current = isAnyModalOpen;
  }, [isAnyModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // While a modal is open every key belongs to the modal, keep the selection it acts on intact.
      if (isAnyModalOpen) return;

      if (e.key === 'Escape') {
        if (hasSelection) onEscape();
        return;
      }

      // Exactly the advertised combo, nothing extra. This keeps Cmd/Ctrl+Shift+A, Ctrl+Alt+A and
      // AltGr+A (Ctrl+Alt on Windows/Linux layouts) from hijacking select-all.
      const isMac = isMacOS();
      const hasPlatformModifierOnly = !e.shiftKey && !e.altKey && (isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey);
      const hasNoModifier = !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey;

      const isSelectAllShortcut = hasPlatformModifierOnly && e.key.toLowerCase() === 'a';
      const isDeleteShortcut = isMac
        ? hasPlatformModifierOnly && (e.key === 'Backspace' || e.key === 'Delete')
        : hasNoModifier && e.key === 'Delete';

      if (!isSelectAllShortcut && !isDeleteShortcut) return;

      const activeTag = document.activeElement?.tagName;
      const isTextFieldFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.isContentEditable;
      if (isTextFieldFocused) return;

      // The list owns the keyboard while the mouse is over it or focus is inside it (a click on a row
      // focuses the scope). Focus keeps the shortcuts working after the mouse moves away.
      const scope = scopeRef.current;
      if (!scope || !(scope.matches(':hover') || scope.contains(document.activeElement))) return;

      e.preventDefault();
      if (isSelectAllShortcut) {
        onSelectAll();
      } else {
        onDelete();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAnyModalOpen, hasSelection, onEscape, onSelectAll, onDelete]);

  return { scopeRef };
};

export default useEnvironmentShortcuts;
