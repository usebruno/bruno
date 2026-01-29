import React from 'react';
import { uuid } from 'utils/common';
import { IconBox, IconRun, IconEye, IconSettings } from '@tabler/icons';
import EnvironmentSelector from 'components/Environments/EnvironmentSelector';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { useDispatch } from 'react-redux';
import ToolHint from 'components/ToolHint';
import StyledWrapper from './StyledWrapper';
import JsSandboxMode from 'components/SecuritySettings/JsSandboxMode';
import ActionIcon from 'ui/ActionIcon';

const CollectionToolBar = ({ collection }) => {
  const dispatch = useDispatch();

  if (!collection) {
    return null;
  }

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
      <div className="flex items-center justify-between gap-2 py-2 px-4">
        <button className="flex items-center cursor-pointer hover:underline bg-transparent border-none p-0 text-inherit" onClick={viewCollectionSettings}>
          <IconBox size={18} strokeWidth={1.5} />
          <span className="ml-2 mr-4 font-medium">{collection?.name}</span>
        </button>
        <div className="flex flex-grow gap-1 items-center justify-end">
          <ToolHint text="Runner" toolhintId="RunnerToolhintId" place="bottom">
            <ActionIcon onClick={handleRun} aria-label="Runner" size="sm">
              <IconRun size={16} strokeWidth={1.5} />
            </ActionIcon>
          </ToolHint>
          <ToolHint text="Variables" toolhintId="VariablesToolhintId">
            <ActionIcon onClick={viewVariables} aria-label="Variables" size="sm">
              <IconEye size={16} strokeWidth={1.5} />
            </ActionIcon>
          </ToolHint>
          <ToolHint text="Collection Settings" toolhintId="CollectionSettingsToolhintId">
            <ActionIcon onClick={viewCollectionSettings} aria-label="Collection Settings" size="sm">
              <IconSettings size={16} strokeWidth={1.5} />
            </ActionIcon>
          </ToolHint>
          {/* ToolHint is present within the JsSandboxMode component */}
          <JsSandboxMode collection={collection} />
          <span className="ml-2">
            <EnvironmentSelector collection={collection} />
          </span>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CollectionToolBar;
