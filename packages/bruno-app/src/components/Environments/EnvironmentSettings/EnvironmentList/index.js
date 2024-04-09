import React, { useEffect, useState, forwardRef, useRef } from 'react';
import toast from 'react-hot-toast';
import { toastError } from 'utils/common/error';
import { findEnvironmentInCollection } from 'utils/collections';
import usePrevious from 'hooks/usePrevious';
import EnvironmentDetails from './EnvironmentDetails';
import CreateEnvironment from '../CreateEnvironment';
import { IconDownload, IconShieldLock } from '@tabler/icons';
import ImportEnvironment from '../ImportEnvironment';
import ManageSecrets from '../ManageSecrets';
import StyledWrapper from './StyledWrapper';

import ConfirmSwitchEnv from './ConfirmSwitchEnv';

const EnvironmentList = ({
  selectedEnvironment,
  setSelectedEnvironment,
  collection,
  isModified,
  setIsModified,
  formik
}) => {
  // Pass isModified as a prop
  const { environments } = collection;
  //const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [openManageSecretsModal, setOpenManageSecretsModal] = useState(false);

  const [switchEnvConfirmClose, setSwitchEnvConfirmClose] = useState(false);
  const [tempSelectedEnvironment, setTempSelectedEnvironment] = useState(null);
  const [clickedCreateEnv, setClickedCreateEnv] = useState(false);
  const [clickedImport, setClickedImport] = useState(false);

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

  // Prevent switching to another environment if isModified is true
  const handleEnvironmentClick = (env) => {
    if (!isModified) {
      setSelectedEnvironment(env);
    } else {
      setTempSelectedEnvironment(env); // Store the selected environment temporarily
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
      if (tempSelectedEnvironment == null) {
        setTempSelectedEnvironment(selectedEnvironment); //the curr env
      }
      setClickedCreateEnv(true);
      setSwitchEnvConfirmClose(true);
    }
  };

  const handleImportClick = () => {
    if (!isModified) {
      setOpenImportModal(true);
    } else {
      setClickedImport(true);
      setSwitchEnvConfirmClose(true);
    }
  };

  // Opening secrets does not accidentally discard changes.
  const handleSecretsClick = () => {
    setOpenManageSecretsModal(true);
  };

  const handleConfirmSwitch = (saveChanges) => {
    if (saveChanges) {
      formik.handleSubmit();
      setSwitchEnvConfirmClose(false);
      if (clickedCreateEnv) {
        setOpenCreateModal(true);
        setClickedCreateEnv(false); //set back
      } else if (clickedImport) {
        setOpenImportModal(true);
        setClickedImport(false); //set back
      }
    }
    //close without save
    else {
      setSwitchEnvConfirmClose(false);

      if (clickedCreateEnv) {
        setOpenCreateModal(true);
        setClickedCreateEnv(false); //set back
      } else if (clickedImport) {
        setOpenImportModal(true);
        setClickedImport(false); //set back
      } else {
        //switch env
        setSelectedEnvironment(tempSelectedEnvironment);
      }
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
              <ConfirmSwitchEnv
                onCancel={() => setSwitchEnvConfirmClose(false)}
                onCloseWithoutSave={() => handleConfirmSwitch(false)}
                onSaveAndClose={() => handleConfirmSwitch(true)}
              />
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
        {/* <EnvironmentDetails environment={selectedEnvironment} collection={collection} /> */}
        <EnvironmentDetails
          environment={selectedEnvironment}
          collection={collection}
          isModified={isModified} // Pass isModified prop
          setIsModified={setIsModified} // Pass setIsModified prop
          formik={formik}
        />
      </div>
    </StyledWrapper>
  );
};

export default EnvironmentList;
