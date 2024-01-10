import React, { useEffect, useState } from 'react';
import { findEnvironmentInCollection } from 'utils/collections';
import usePrevious from 'hooks/usePrevious';
import EnvironmentDetails from './EnvironmentDetails';
import CreateEnvironment from '../CreateEnvironment';
import ImportEnvironment from '../ImportEnvironment';
import ManageSecrets from '../ManageSecrets';
import StyledWrapper from './StyledWrapper';
import { Import, LockKeyhole } from 'lucide-react';

const EnvironmentList = ({ collection }) => {
  const { environments } = collection;
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [openManageSecretsModal, setOpenManageSecretsModal] = useState(false);

  const envUids = environments ? environments.map((env) => env.uid) : [];
  const prevEnvUids = usePrevious(envUids);

  useEffect(() => {
    if (selectedEnvironment) {
      return;
    }

    const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
    if (environment) {
      setSelectedEnvironment(environment);
    } else {
      setSelectedEnvironment(environments && environments.length ? environments[0] : null);
    }
  }, [collection, environments, selectedEnvironment]);

  useEffect(() => {
    // check env add
    if (prevEnvUids && prevEnvUids.length && envUids.length > prevEnvUids.length) {
      const newEnv = environments.find((env) => !prevEnvUids.includes(env.uid));
      if (newEnv) {
        setSelectedEnvironment(newEnv);
      }
    }

    // check env delete
    if (prevEnvUids && prevEnvUids.length && envUids.length < prevEnvUids.length) {
      setSelectedEnvironment(environments && environments.length ? environments[0] : null);
    }
  }, [envUids, environments, prevEnvUids]);

  if (!selectedEnvironment) {
    return null;
  }

  return (
    <StyledWrapper>
      {openCreateModal && <CreateEnvironment collection={collection} onClose={() => setOpenCreateModal(false)} />}
      {openImportModal && <ImportEnvironment collection={collection} onClose={() => setOpenImportModal(false)} />}
      {openManageSecretsModal && <ManageSecrets onClose={() => setOpenManageSecretsModal(false)} />}
      <div className="flex">
        <div>
          <div className="environments-sidebar flex flex-col">
            {environments &&
              environments.length &&
              environments.map((env) => (
                <div
                  key={env.uid}
                  className={selectedEnvironment.uid === env.uid ? 'environment-item active' : 'environment-item'}
                  onClick={() => setSelectedEnvironment(env)}
                >
                  <span>{env.name}</span>
                </div>
              ))}
            <div className="btn-create-environment" onClick={() => setOpenCreateModal(true)}>
              + <span>Create</span>
            </div>

            <div className="mt-auto btn-import-environment">
              <div className="flex items-center" onClick={() => setOpenImportModal(true)}>
                <Import size={16} strokeWidth={2} />
                <span className="label ml-1 text-xs">Import</span>
              </div>
              <div className="flex items-center mt-2" onClick={() => setOpenManageSecretsModal(true)}>
                <LockKeyhole size={16} strokeWidth={2} />
                <span className="label ml-1 text-xs">Managing Secrets</span>
              </div>
            </div>
          </div>
        </div>
        <EnvironmentDetails environment={selectedEnvironment} collection={collection} />
      </div>
    </StyledWrapper>
  );
};

export default EnvironmentList;
