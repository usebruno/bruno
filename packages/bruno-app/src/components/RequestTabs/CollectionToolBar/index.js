import React from 'react';
import { uuid } from 'utils/common';
import { IconFiles, IconRun, IconEye, IconSettings, IconShieldLock } from '@tabler/icons';
import EnvironmentSelector from 'components/Environments/EnvironmentSelector';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import SecuritySettingsIcon from 'components/SecuritySettings/SecurityIconWithModal/index';

const CollectionToolBar = ({ collection }) => {
  const dispatch = useDispatch();
  const appMode = collection?.securityConfig?.appMode;

  const handleRun = () => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'collection-runner'
      })
    );
  };

  const viewVariables = () => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'variables'
      })
    );
  };

  const viewCollectionSettings = () => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'collection-settings'
      })
    );
  };

  const viewSecuritySettings = () => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'security-settings'
      })
    );
  };

  return (
    <StyledWrapper>
      <div className="flex items-center p-2">
        <div className="flex flex-1 items-center cursor-pointer hover:underline" onClick={viewCollectionSettings}>
          <IconFiles size={18} strokeWidth={1.5} />
          <span className="ml-2 mr-4 font-semibold">{collection?.name}</span>
        </div>
        <div className="flex flex-1 items-center justify-end">
          {appMode && (
            <span
              className={`mr-4 border border-slate-500 px-2 py-1 rounded-md text-xs cursor-pointer opacity-70 ${appMode}`}
              onClick={viewSecuritySettings}
            >
              {appMode} mode
            </span>
          )}
          <span className="mr-2">
            <SecuritySettingsIcon collection={collection} />
          </span>
          <span className="mr-2">
            <IconRun className="cursor-pointer" size={20} strokeWidth={1.5} onClick={handleRun} />
          </span>
          <span className="mr-3">
            <IconEye className="cursor-pointer" size={18} strokeWidth={1.5} onClick={viewVariables} />
          </span>
          <span className="mr-3">
            <IconSettings className="cursor-pointer" size={18} strokeWidth={1.5} onClick={viewCollectionSettings} />
          </span>
          <EnvironmentSelector collection={collection} />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CollectionToolBar;
