import React from 'react';
import useDefaultApiSpecLocation from 'hooks/useDefaultApiSpecLocation';
import CloneApiSpecForm from './CloneApiSpecForm';

const CloneApiSpec = ({ apiSpec, onClose }) => {
  const { location, isResolved } = useDefaultApiSpecLocation();

  if (!isResolved) {
    return null;
  }

  return <CloneApiSpecForm apiSpec={apiSpec} defaultLocation={location} onClose={onClose} />;
};

export default CloneApiSpec;
