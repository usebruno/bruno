import React from 'react';
import { uuid } from 'utils/common';
import { IconBox, IconRun, IconEye, IconSettings } from '@tabler/icons';
import EnvironmentSelector from 'components/Environments/EnvironmentSelector';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { useDispatch } from 'react-redux';
import ToolHint from 'components/ToolHint';
import StyledWrapper from './StyledWrapper';
import JsSandboxMode from 'components/SecuritySettings/JsSandboxMode';

const CollectionToolBar = ({ collection }) => {
  const dispatch = useDispatch();

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
        uid: collection.uid,
        collectionUid: collection.uid,
        type: 'collection-settings'
      })
    );
  };

  return (
    <StyledWrapper>
      <div className="header-container flex items-center p-2 px-3">
        <div className="flex flex-1 items-center gap-1 cursor-pointer hover:underline" onClick={viewCollectionSettings}>
          <span className="p-2 max-w-[32px]">
            <IconBox size={18} strokeWidth={1.5} />
          </span>
          <span className="font-semibold">{collection?.name}</span>
        </div>
        <div className="flex flex-1 items-center justify-end gap-3">
          <span>
            <JsSandboxMode collection={collection} />
          </span>
          <span className="flex items-center gap-1">
            <span className="action-icon">
              <ToolHint text="Runner" toolhintId="RunnnerToolhintId" place="bottom">
                <IconRun className="cursor-pointer" size={18} strokeWidth={1.5} onClick={handleRun} />
              </ToolHint>
            </span>
            <span className="action-icon">
              <ToolHint text="Variables" toolhintId="VariablesToolhintId">
                <IconEye className="cursor-pointer" size={18} strokeWidth={1.5} onClick={viewVariables} />
              </ToolHint>
            </span>
            <span className="action-icon">
              <ToolHint text="Collection Settings" toolhintId="CollectionSettingsToolhintId">
                <IconSettings className="cursor-pointer" size={18} strokeWidth={1.5} onClick={viewCollectionSettings} />
              </ToolHint>
            </span>
          </span>
          <span>
            <EnvironmentSelector collection={collection} />
          </span>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CollectionToolBar;
