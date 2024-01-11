import React from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { responseCleared } from 'providers/ReduxStore/slices/collections/index';
import { Eraser } from 'lucide-react';

const ResponseClear = ({ collection, item }) => {
  const dispatch = useDispatch();

  const clearResponse = () =>
    dispatch(
      responseCleared({
        itemUid: item.uid,
        collectionUid: collection.uid,
        response: null
      })
    );

  return (
    <StyledWrapper className="ml-2 flex items-center">
      <button className="hover:text-slate-950 dark:hover:text-white" onClick={clearResponse} title="Clear response">
        <Eraser size={16} />
      </button>
    </StyledWrapper>
  );
};
export default ResponseClear;
