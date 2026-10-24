import React from 'react';
import { IconExternalLink } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { updateSettingsSelectedTab, updatedFolderSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { humanizeRequestAuthMode } from 'utils/collections';
import AuthFields from '../AuthFields';
import StyledWrapper from './StyledWrapper';

const noop = () => {};
const noopUpdateAuth = () => ({ type: 'noop' });

export const isInheritedAuthSupported = (inheritedSource, supportedModes) => {
  if (!supportedModes) {
    return true;
  }

  const inheritedMode = inheritedSource?.auth?.mode;
  return Boolean(inheritedMode && supportedModes.includes(inheritedMode));
};

const getUnsupportedInheritedAuthMessage = (inheritedMode, protocolLabel) => {
  const modeLabel = humanizeRequestAuthMode(inheritedMode);
  if (protocolLabel) {
    return `${modeLabel} is not supported by ${protocolLabel}. Using no auth instead.`;
  }
  return `${modeLabel} is not supported. Using no auth instead.`;
};

export const InheritedAuthSourceLabel = ({ collection, inheritedSource, supportedModes, protocolLabel, unsupportedMessage }) => {
  const dispatch = useDispatch();
  const inheritedMode = inheritedSource?.auth?.mode;

  if (!inheritedSource) {
    return null;
  }

  if (!isInheritedAuthSupported(inheritedSource, supportedModes)) {
    const message = unsupportedMessage || getUnsupportedInheritedAuthMessage(inheritedMode, protocolLabel);
    return (
      <StyledWrapper className="inherited-auth-source">
        <div className="inherited-auth-source-row">
          <div
            className="inherited-auth-source-copy"
            data-testid="inherited-auth-unsupported"
            title={typeof message === 'string' ? message : undefined}
          >
            {message}
          </div>
        </div>
      </StyledWrapper>
    );
  }

  const handleNavigateToSource = () => {
    if (!collection?.uid) {
      return;
    }

    const isFolder = inheritedSource.type === 'folder';
    const targetUid = isFolder ? inheritedSource.uid : collection.uid;
    if (!targetUid) {
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
    <StyledWrapper className="inherited-auth-source">
      <div className="inherited-auth-source-row">
        <div className="inherited-auth-source-copy" title={`Auth inherited from ${inheritedSource.name}`}>
          Auth inherited from <span className="inherited-auth-source-name">{inheritedSource.name}</span>:
        </div>
        <button
          type="button"
          className="inherit-mode-text"
          data-testid="inherited-auth-mode"
          onClick={handleNavigateToSource}
          aria-label={`Open ${humanizeRequestAuthMode(inheritedMode)} auth in ${inheritedSource.name}`}
        >
          {humanizeRequestAuthMode(inheritedMode)}
          <IconExternalLink size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </StyledWrapper>
  );
};

const InheritedAuth = ({ collection, item, inheritedSource, supportedModes, unsupportedMessage }) => {
  const inheritedMode = inheritedSource?.auth?.mode;
  const inheritedRequest = { auth: inheritedSource?.auth || { mode: 'none' } };

  if (!isInheritedAuthSupported(inheritedSource, supportedModes)) {
    return null;
  }

  return (
    <StyledWrapper>
      <div className="inherited-auth-fields" data-testid="inherited-auth-fields" aria-disabled="true">
        <AuthFields
          authMode={inheritedMode}
          collection={collection}
          item={item}
          request={inheritedRequest}
          save={noop}
          updateAuth={noopUpdateAuth}
          disabled
        />
      </div>
    </StyledWrapper>
  );
};

export default InheritedAuth;
