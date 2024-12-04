import React, { useEffect, useState } from 'react';
import usePrevious from 'hooks/usePrevious';
import EnvironmentDetails from './EnvironmentDetails';
import CreateEnvironment from '../CreateEnvironment';
import { IconDownload, IconShieldLock } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import ConfirmSwitchEnv from './ConfirmSwitchEnv';
import ManageSecrets from 'components/Environments/EnvironmentSettings/ManageSecrets/index';
import ImportEnvironment from '../ImportEnvironment';
import { isEqual } from 'lodash';

const EnvironmentList = ({ environments, activeEnvironmentUid, selectedEnvironment, setSelectedEnvironment, isModified, setIsModified }) => {
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [openManageSecretsModal, setOpenManageSecretsModal] = useState(false);

  const [switchEnvConfirmClose, setSwitchEnvConfirmClose] = useState(false);
  const [originalEnvironmentVariables, setOriginalEnvironmentVariables] = useState([]);

  const envUids = environments ? environments.map((env) => env.uid) : [];
  const prevEnvUids = usePrevious(envUids);

  useEffect(() => {
    if (!environments?.length) {
      setSelectedEnvironment(null);
      setOriginalEnvironmentVariables([]);
      return;
    }

    if (selectedEnvironment) {
      const _selectedEnvironment = environments?.find(env => env?.uid === selectedEnvironment?.uid);
      const hasSelectedEnvironmentChanged = !isEqual(selectedEnvironment, _selectedEnvironment);
      if (hasSelectedEnvironmentChanged) {
        setSelectedEnvironment(_selectedEnvironment);
      }
      setOriginalEnvironmentVariables(selectedEnvironment.variables);
      return;
    }

    const environment = environments?.find(env => env.uid === activeEnvironmentUid) || environments?.[0];

    setSelectedEnvironment(environment);
    setOriginalEnvironmentVariables(environment?.variables || []);
  }, [environments, activeEnvironmentUid]);
  

  useEffect(() => {
    if (prevEnvUids && prevEnvUids.length && envUids.length > prevEnvUids.length) {
      const newEnv = environments.find((env) => !prevEnvUids.includes(env.uid));
      if (newEnv) {
        setSelectedEnvironment(newEnv);
      }
    }

    if (prevEnvUids && prevEnvUids.length && envUids.length < prevEnvUids.length) {
      setSelectedEnvironment(environments && environments.length ? environments[0] : null);
    }
  }, [envUids, environments, prevEnvUids]);

  const handleEnvironmentClick = (env) => {
    if (!isModified) {
      setSelectedEnvironment(env);
    } else {
      setSwitchEnvConfirmClose(true);
    }
  };

  if (!selectedEnvironment) {
    return null;
  }

  const handleCreateEnvClick = () => {
    if (!isModified) {
      setOpenCreateModal(true);
    } else {
      setSwitchEnvConfirmClose(true);
    }
  };

  const handleImportClick = () => {
    if (!isModified) {
      setOpenImportModal(true);
    } else {
      setSwitchEnvConfirmClose(true);
    }
  };

  const handleSecretsClick = () => {
    setOpenManageSecretsModal(true);
  };

  const handleConfirmSwitch = (saveChanges) => {
    if (!saveChanges) {
      setSwitchEnvConfirmClose(false);
    }
  };

  return (
    <StyledWrapper>
      {openCreateModal && <CreateEnvironment onClose={() => setOpenCreateModal(false)} />}
      {openImportModal && <ImportEnvironment onClose={() => setOpenImportModal(false)} />}
      {openManageSecretsModal && <ManageSecrets onClose={() => setOpenManageSecretsModal(false)} />}

      <div className="flex">
        <div>
          {switchEnvConfirmClose && (
            <div className="flex items-center justify-between tab-container px-1">
              <ConfirmSwitchEnv onCancel={() => handleConfirmSwitch(false)} />
            </div>
          )}
          <div className="environments-sidebar flex flex-col">
            {environments &&
              environments.length &&
              environments.map((env) => (
                <div
                  key={env.uid}
                  className={selectedEnvironment.uid === env.uid ? 'environment-item active' : 'environment-item'}
                  onClick={() => handleEnvironmentClick(env)} // Use handleEnvironmentClick to handle clicks
                >
                  <span className="break-all">{env.name}</span>
                </div>
              ))}
            <div className="btn-create-environment" onClick={() => handleCreateEnvClick()}>
              + <span>Create</span>
            </div>

            <div className="mt-auto btn-import-environment">
              <div className="flex items-center" onClick={() => handleImportClick()}>
                <IconDownload size={12} strokeWidth={2} />
                <span className="label ml-1 text-xs">Import</span>
              </div>
              <div className="flex items-center mt-2" onClick={() => handleSecretsClick()}>
                <IconShieldLock size={12} strokeWidth={2} />
                <span className="label ml-1 text-xs">Managing Secrets</span>
              </div>
            </div>
          </div>
        </div>
        <EnvironmentDetails
          environment={selectedEnvironment}
          setIsModified={setIsModified}
          originalEnvironmentVariables={originalEnvironmentVariables}
        />
      </div>
    </StyledWrapper>
  );
};

export default EnvironmentList;
