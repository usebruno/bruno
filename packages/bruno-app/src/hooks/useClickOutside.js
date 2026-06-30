import { useEffect, useRef } from 'react';

const useClickOutside = (refs, onClose) => {
  const savedOnClose = useRef(onClose);
  savedOnClose.current = onClose;

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutside = refs.every((ref) => !ref.current || !ref.current.contains(event.target));
      if (isOutside) savedOnClose.current();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
};

export default useClickOutside;
