import React from 'react';
import { useSelector } from 'react-redux';
import StyledWrapper from './StyledWrapper';

const AppLoader = () => {
  const message = useSelector((state) => state.app.snapshotRestoreMessage);

  return (
    <StyledWrapper>
      <div className="spinner" />
      <p className="message">{message || 'Restoring session...'}</p>
    </StyledWrapper>
  );
};

export default AppLoader;
