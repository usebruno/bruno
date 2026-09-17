import React from 'react';
import { useDispatch } from 'react-redux';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { updateSettingsSelectedTab, updatedFolderSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { humanizeRequestAuthMode } from 'utils/collections';
import AuthFields from '../AuthFields';
import StyledWrapper from './StyledWrapper';

const InheritedAuth = ({ collection, item, inheritedSource, supportedModes, unsupportedMessage }) => {
  const dispatch = useDispatch();
  const inheritedMode = inheritedSource?.auth?.mode;
  const inheritedRequest = { auth: inheritedSource?.auth || { mode: 'none' } };

  if (supportedModes && inheritedMode && !supportedModes.includes(inheritedMode)) {
    return (
      <div className="flex flex-row w-full gap-2">
        <div>{unsupportedMessage || 'Inherited auth not supported. Using no auth instead.'}</div>
      </div>
    );
  }

  const handleNavigateToSource = () => {
    const isFolder = inheritedSource?.type === 'folder';
    const targetUid = isFolder ? inheritedSource.uid : collection.uid;
    if (!targetUid || !collection?.uid) {
      return;
    }

    dispatch(addTab({
      uid: targetUid,
      collectionUid: collection.uid,
      type: isFolder ? 'folder-settings' : 'collection-settings'
    }));

    if (isFolder) {
      dispatch(updatedFolderSettingsSelectedTab({
        collectionUid: collection.uid,
        folderUid: inheritedSource.uid,
        tab: 'auth'
      }));
      return;
    }

    dispatch(updateSettingsSelectedTab({
      collectionUid: collection.uid,
      tab: 'auth'
    }));
  };

  return (
    <StyledWrapper>
      <div className="flex flex-row w-full gap-2 items-center">
        <div>Auth inherited from {inheritedSource?.name}: </div>
        <button
          type="button"
          className="inherit-mode-text"
          data-testid="inherited-auth-mode"
          onClick={handleNavigateToSource}
          aria-label={`Open ${humanizeRequestAuthMode(inheritedMode)} auth in ${inheritedSource?.name}`}
        >
          {humanizeRequestAuthMode(inheritedMode)}
        </button>
      </div>
      <div className="inherited-auth-fields mt-4" data-testid="inherited-auth-fields" aria-disabled="true">
        <AuthFields
          authMode={inheritedMode}
          collection={collection}
          item={item}
          request={inheritedRequest}
          disabled
        />
      </div>
    </StyledWrapper>
  );
};

export default InheritedAuth;
