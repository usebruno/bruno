import React from 'react';
import { useDispatch } from 'react-redux';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import GradientCloseButton from '../RequestTab/GradientCloseButton';
import StyledWrapper from '../RequestTab/StyledWrapper';

const MockResponseTab = ({ tab }) => {
  const dispatch = useDispatch();

  return (
    <StyledWrapper className="flex items-center">
      <span className="truncate">{tab.responseName || tab.tabName || 'Mock Response'}</span>
      <GradientCloseButton
        onClick={(event) => {
          event.stopPropagation();
          dispatch(closeTabs({ tabUids: [tab.uid] }));
        }}
      />
    </StyledWrapper>
  );
};

export default MockResponseTab;
