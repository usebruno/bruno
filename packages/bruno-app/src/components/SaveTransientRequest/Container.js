import React from 'react';
import { useSelector } from 'react-redux';
import SaveTransientRequest from './index';

const SaveTransientRequestContainer = () => {
  const modals = useSelector((state) => state.collections.saveTransientRequestModals);

  return (
    <>
      {Object.keys(modals).map((modalId) => (
        <SaveTransientRequest key={modalId} modalId={modalId} />
      ))}
    </>
  );
};

export default SaveTransientRequestContainer;
