import React from 'react';
import { IconSortDescending2, IconSortAscending2 } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import StyledWrapper from './StyledWrapper';
import { wsUpdateResponseSortOrder } from 'providers/ReduxStore/slices/collections/index';

const WSResponseSortOrder = ({ collection, item }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const order = item.response?.sortOrder ?? -1;

  const toggleSortOrder = () => {
    dispatch(wsUpdateResponseSortOrder({
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  return (
    <StyledWrapper className="ml-2 flex items-center">
      <button onClick={toggleSortOrder} title={order === -1 ? t('WS_RESPONSE.SORT_LATEST_LAST') : t('WS_RESPONSE.SORT_LATEST_FIRST')}>
        { order === -1
          ? <IconSortDescending2 size={16} strokeWidth={1.5} />
          : <IconSortAscending2 size={16} strokeWidth={1.5} />}
      </button>
    </StyledWrapper>
  );
};

export default WSResponseSortOrder;
