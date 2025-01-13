import { useState, useEffect } from 'react';
import { IconTrash, IconAlertCircle } from '@tabler/icons';

const RemoveButton = ({ onClick }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const CONFIRM_DURATION = 3000; // 3 seconds

  useEffect(() => {
    let timer;
    if (isConfirming) {
      timer = setTimeout(() => {
        setIsConfirming(false);
      }, CONFIRM_DURATION);
    }
    return () => clearTimeout(timer);
  }, [isConfirming]);

  const handleClick = () => {
    if (isConfirming) {
      onClick();
      setIsConfirming(false);
    } else {
      setIsConfirming(true);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center justify-center ${
        isConfirming && 'text-yellow-500 hover:text-yellow-700'
      } focus:outline-none transition-colors duration-300`}
      aria-label={isConfirming ? 'Confirm delete' : 'Delete'}
    >
      {isConfirming ? (
        <IconAlertCircle strokeWidth={1.5} size={20} />
      ) : (
        <IconTrash strokeWidth={1.5} size={20} />
      )}
    </button>
  );
};

export default RemoveButton;