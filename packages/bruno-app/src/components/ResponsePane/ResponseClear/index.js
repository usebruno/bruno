import React from 'react';
import { IconEraser } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { responseCleared } from 'providers/ReduxStore/slices/collections/index';

const ResponseClear = ({ collection, item, asDropdownItem, onClose }) => {
  const dispatch = useDispatch();

  const clearResponse = () => {
    if (onClose) onClose();
    dispatch(
      responseCleared({
        itemUid: item.uid,
        collectionUid: collection.uid,
        response: null
      })
    );
  };

  if (asDropdownItem) {
    return (
      <div className="dropdown-item" onClick={clearResponse}>
        <IconEraser size={16} strokeWidth={1.5} className="icon mr-2" />
        Clear
      </div>
    );
  }

  return (
    <StyledWrapper className="ml-2 flex items-center">
      <button onClick={clearResponse} title="Clear response">
        <IconEraser size={16} strokeWidth={1.5} />
      </button>
    </StyledWrapper>
  );
};
export default ResponseClear;
