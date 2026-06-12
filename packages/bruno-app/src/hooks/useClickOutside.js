import { useEffect } from 'react';

const useClickOutside = (refs, onClose) => {
  const handleClickOutside = (event) => {
    const isOutside = refs.every((ref) => !ref.current || !ref.current.contains(event.target));
    if (isOutside) onClose();
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refs, onClose]);
};

export default useClickOutside;
