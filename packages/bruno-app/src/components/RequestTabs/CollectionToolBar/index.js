import React, { useState, useEffect } from 'react';
import { uuid } from 'utils/common';
import { IconFiles, IconRun, IconEye, IconSettings, IconSearch } from '@tabler/icons';
import EnvironmentSelector from 'components/Environments/EnvironmentSelector';
import GlobalEnvironmentSelector from 'components/GlobalEnvironments/EnvironmentSelector';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { useDispatch } from 'react-redux';
import ToolHint from 'components/ToolHint';
import StyledWrapper from './StyledWrapper';
import JsSandboxMode from 'components/SecuritySettings/JsSandboxMode';
import CollectionSearch from 'components/CollectionSearch';
import Mousetrap from 'mousetrap';

const CollectionToolBar = ({ collection }) => {
  const dispatch = useDispatch();
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  useEffect(() => {
    Mousetrap.bind(['command+k', 'ctrl+k'], (e) => {
      e.preventDefault();
      handleSearch();
    });

    return () => {
      Mousetrap.unbind(['command+k', 'ctrl+k']);
    };
  }, []);

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

  const handleSearch = () => setSearchModalOpen(true);
  const handleCloseSearch = () => setSearchModalOpen(false);

  return (
    <StyledWrapper>
      {searchModalOpen && <CollectionSearch onClose={handleCloseSearch} collection={collection} />}
      <div className="flex items-center p-2">
        <div className="flex flex-1 items-center cursor-pointer hover:underline" onClick={viewCollectionSettings}>
          <IconFiles size={18} strokeWidth={1.5} />
          <span className="ml-2 mr-4 font-semibold">{collection?.name}</span>
        </div>
        <div className="flex flex-3 items-center justify-end">
          <span className="mr-3">
            <JsSandboxMode collection={collection} />
          </span>
          <span className="mr-3">
            <ToolHint text="Search" toolhintId="SearchToolhintId" place='bottom'>
              <IconSearch className="cursor-pointer" size={20} strokeWidth={1.5} onClick={handleSearch} />
            </ToolHint>
          </span>
          <span className="mr-3">
            <ToolHint text="Runner" toolhintId="RunnnerToolhintId" place='bottom'>
              <IconRun className="cursor-pointer" size={18} strokeWidth={1.5} onClick={handleRun} />
            </ToolHint>
          </span>
          <span className="mr-3">
            <ToolHint text="Variables" toolhintId="VariablesToolhintId">
              <IconEye className="cursor-pointer" size={18} strokeWidth={1.5} onClick={viewVariables} />
            </ToolHint>
          </span>
          <span className="mr-3">
            <ToolHint text="Collection Settings" toolhintId="CollectionSettingsToolhintId">
              <IconSettings className="cursor-pointer" size={18} strokeWidth={1.5} onClick={viewCollectionSettings} />
            </ToolHint>
          </span>
          <span>
            <GlobalEnvironmentSelector />
          </span>
          <EnvironmentSelector collection={collection} />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CollectionToolBar;
