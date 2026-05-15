import React from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import StyledWrapper from './StyledWrapper';
import { clearRequestTimeline } from 'providers/ReduxStore/slices/collections/index';

const ClearTimeline = ({ collection, item }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const clearResponse = () =>
    dispatch(
      clearRequestTimeline({
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );

  return (
    <StyledWrapper className="flex items-center">
      <button type="button" onClick={clearResponse} className="text-link hover:underline whitespace-nowrap" title={t('RESPONSE_PANE.CLEAR_TIMELINE')}>
        {t('RESPONSE_PANE.CLEAR_TIMELINE')}
      </button>
    </StyledWrapper>
  );
};

export default ClearTimeline;
