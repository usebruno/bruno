import React from 'react';
import { IconSortDescending2, IconSortAscending2 } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { wsUpdateResponseSortOrder } from 'providers/ReduxStore/slices/collections/index';

const WSResponseSortOrder = ({ collection, item }) => {
  const dispatch = useDispatch();

  const order = item.response?.sortOrder ?? -1;

  const toggleSortOrder = () => {
    dispatch(wsUpdateResponseSortOrder({
      itemUid: item.uid,
      collectionUid: collection.uid,
    }));
  };

  return (
    <StyledWrapper className="ml-2 flex items-center">
      <button onClick={toggleSortOrder} title={order === -1 ? 'Latest Last' : 'Latest First'}>
        { order === -1
          ? <IconSortDescending2 size={16} strokeWidth={1.5} />
          : <IconSortAscending2 size={16} strokeWidth={1.5} />}
      </button>
    </StyledWrapper>
  );
};

export default WSResponseSortOrder;
