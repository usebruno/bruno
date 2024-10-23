import React, { useEffect, useState } from 'react';
import { findItem } from 'utils/collections';
import usePrevious from 'hooks/usePrevious';
import EnvironmentDetails from './EnvironmentDetails';
import CreateEnvironment from '../CreateEnvironment';
import { IconDownload, IconShieldLock } from '@tabler/icons';
import ImportEnvironment from '../ImportEnvironment';
import ManageSecrets from '../ManageSecrets';
import StyledWrapper from './StyledWrapper';
import ConfirmSwitchEnv from './ConfirmSwitchEnv';
import ToolHint from 'components/ToolHint';
import { isEqual } from 'lodash';

const EnvironmentList = ({ collection, isModified, setIsModified, onClose }) => {
  const { environments, activeEnvironmentUid } = collection;
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [openManageSecretsModal, setOpenManageSecretsModal] = useState(false);

  const [switchEnvConfirmClose, setSwitchEnvConfirmClose] = useState(false);
  const [originalEnvironmentVariables, setOriginalEnvironmentVariables] = useState([]);

  const envUids = environments?.map((env) => env.uid) ?? [];
  const prevEnvUids = usePrevious(envUids);

  useEffect(() => {
    if (selectedEnvironment) {
      const _selectedEnvironment = environments?.find(env => env?.uid === selectedEnvironment?.uid);
      const hasSelectedEnvironmentChanged = !isEqual(selectedEnvironment, _selectedEnvironment);
      if (hasSelectedEnvironmentChanged) {
        setSelectedEnvironment(_selectedEnvironment);
      }
      setOriginalEnvironmentVariables(selectedEnvironment.variables);
      setSelectedEnvironment(findItem(environments, selectedEnvironment.uid));
      return;
    }

    const environment = findItem(environments, activeEnvironmentUid);
    if (environment) {
      setSelectedEnvironment(environment);
    } else {
      setSelectedEnvironment(environments?.length ? environments[0] : null);
    }
  }, [activeEnvironmentUid, selectedEnvironment]);

  useEffect(() => {
    //FIXME check if still useful
    if (selectedEnvironment) {
      setSelectedEnvironment(findEnvironmentInCollection(collection, selectedEnvironment.uid));
    }
  }, [environments]);

  useEffect(() => {
    if (prevEnvUids?.length && envUids.length > prevEnvUids.length) {
      const newEnv = environments.find((env) => !prevEnvUids.includes(env.uid));
      if (newEnv) {
        setSelectedEnvironment(newEnv);
      }
    }

    if (prevEnvUids?.length && envUids.length < prevEnvUids.length) {
      setSelectedEnvironment(environments?.length ? environments[0] : null);
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
      {openCreateModal && <CreateEnvironment collection={collection} onClose={() => setOpenCreateModal(false)} />}
      {openImportModal && <ImportEnvironment collection={collection} onClose={() => setOpenImportModal(false)} />}
      {openManageSecretsModal && <ManageSecrets onClose={() => setOpenManageSecretsModal(false)} />}

      <div className="flex">
        <div>
          {switchEnvConfirmClose && (
            <div className="flex items-center justify-between tab-container px-1">
              <ConfirmSwitchEnv onCancel={() => handleConfirmSwitch(false)} />
            </div>
          )}
          <div className="environments-sidebar flex flex-col">
            {environments?.map((env) => (
                <ToolHint key={env.uid} text={env.name} toolhintId={env.uid} place="right">
                  <div
                    id={env.uid}
                    className={selectedEnvironment.uid === env.uid ? 'environment-item active' : 'environment-item'}
                    onClick={() => handleEnvironmentClick(env)} // Use handleEnvironmentClick to handle clicks
                  >
                      <span className="break-all">{env.name}</span>
                  </div>
                </ToolHint>
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
          collection={collection}
          setIsModified={setIsModified}
          originalEnvironmentVariables={originalEnvironmentVariables}
          onClose={onClose}
        />
      </div>
    </StyledWrapper>
  );
};

export default EnvironmentList;
