import React, { useEffect, useState, forwardRef, useRef } from 'react';
import { findEnvironmentInCollection } from 'utils/collections';
import EnvironmentDetails from './EnvironmentDetails';
import CreateEnvironment from '../CreateEnvironment/index';
import StyledWrapper from './StyledWrapper';

const EnvironmentList = ({ collection }) => {
  const { environments } = collection;
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [openCreateModal, setOpenCreateModal] = useState(false);

  useEffect(() => {
    const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
    if(environment) {
      setSelectedEnvironment(environment);
    } else {
      setSelectedEnvironment(environments && environments.length ? environments[0] : null);
    }
  }, [collection, environments]);

  if (!selectedEnvironment) {
    return null;
  }

  return (
    <StyledWrapper>
      {openCreateModal && <CreateEnvironment collection={collection} onClose={() => setOpenCreateModal(false)} />}
      <div className="flex">
        <div>
          <div className="environments-sidebar">
            {environments &&
              environments.length &&
              environments.map((env) => (
                <div key={env.uid} className={selectedEnvironment.uid === env.uid ? 'environment-item active' : 'environment-item'} onClick={() => setSelectedEnvironment(env)}>
                  <span>{env.name}</span>
                </div>
              ))}
            <div className="btn-create-environment" onClick={() => setOpenCreateModal(true)}>
              + <span>Create</span>
            </div>
          </div>
        </div>
        <EnvironmentDetails environment={selectedEnvironment} collection={collection} />
      </div>
    </StyledWrapper>
  );
};

export default EnvironmentList;
