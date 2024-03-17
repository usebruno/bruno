import React from 'react';
import { uuid } from 'utils/common';
import { IconFiles, IconRun, IconEye, IconSettings } from '@tabler/icons';
import EnvironmentSelector from 'components/Environments/EnvironmentSelector';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { useDispatch, useSelector } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { findItemInCollection } from 'utils/collections';

const CollectionToolBar = ({ collection, activeTabUid }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTab = tabs.find((tab) => tab.uid === activeTabUid);

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

  const item = findItemInCollection(collection, activeTabUid);

  let tabInfo = null;
  switch (activeTab.type) {
    case 'request':
      if (item) {
        tabInfo = item.name;
        if (item.draft) {
          tabInfo += '*';
        }
      }
      break;
    case 'collection-settings':
      tabInfo = 'Settings';
      break;
    case 'variables':
      tabInfo = 'Variables';
      break;
    case 'collection-runner':
      tabInfo = 'Runner';
      break;
    default:
      console.log(activeTab.type);
  }

  return (
    <StyledWrapper>
      <div className="flex items-center p-2">
        <div className="flex flex-1 gap-2">
          <div className="flex items-center cursor-pointer hover:underline" onClick={viewCollectionSettings}>
            <IconFiles size={18} strokeWidth={1.5} />
            <span className="ml-2 font-semibold">{collection.name}</span>
          </div>
          {tabInfo ? (
            <>
              <span className="font-semibold">-</span>
              <span className="font-semibold">{tabInfo}</span>
            </>
          ) : null}
        </div>
        <div className="flex flex-1 items-center justify-end">
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
