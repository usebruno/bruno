import { useState, useEffect } from 'react';
import { IconTrash, IconAlertCircle } from '@tabler/icons';
import ToolHint from 'components/ToolHint/index';

const RemoveButton = ({ onClick }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const CONFIRM_DURATION = 1500; // 3 seconds

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
      className={`flex items-center justify-center ${isConfirming && 'text-red-400'
        } focus:outline-none`}
      aria-label={isConfirming ? 'Confirm delete' : 'Delete'}
    >
      {isConfirming ? <ToolHint text="Click again to delete" className='select-none' place='right' toolhintId="IconTrashToolhintId">
        <IconTrash strokeWidth={1.5} size={20} />
      </ToolHint> : <IconTrash strokeWidth={1.5} size={20} />}
    </button>
  );
};

export default RemoveButton;