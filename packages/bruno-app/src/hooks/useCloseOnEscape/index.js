import { useEffect } from 'react';

// Listens on document so Esc works even when focus is outside the popover.
const useCloseOnEscape = (onClose, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape, true);
    return () => document.removeEventListener('keydown', handleEscape, true);
  }, [onClose, enabled]);
};

export default useCloseOnEscape;
