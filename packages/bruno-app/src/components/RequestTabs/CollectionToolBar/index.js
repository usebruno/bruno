import React, { useState } from 'react';
import { uuid } from 'utils/common';
import { IconFiles, IconRun, IconEye, IconSettings, IconDeviceFloppy } from '@tabler/icons';
import EnvironmentSelector from 'components/Environments/EnvironmentSelector';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { useDispatch, useSelector } from 'react-redux';
import { flattenItems, isItemARequest } from 'utils/collections';
import filter from 'lodash/filter';
import ToolHint from 'components/ToolHint';
import StyledWrapper from './StyledWrapper';
import JsSandboxMode from 'components/SecuritySettings/JsSandboxMode';
import SaveAllModal from './SaveAllModal';

const CollectionToolBar = ({ collection }) => {
  const dispatch = useDispatch();
  const [showSaveAllModal, setShowSaveAllModal] = useState(false);

  // Count drafts in current collection
  const draftCount = React.useMemo(() => {
    if (!collection) return 0;
    const items = flattenItems(collection.items);
    const drafts = filter(items, (item) => isItemARequest(item) && item.draft);
    return drafts.length;
  }, [collection]);

  // Listen for keyboard shortcut event to open modal
  React.useEffect(() => {
    const handleOpenSaveAllModal = (event) => {
      // Only open if this is the current collection
      if (event.detail.collection && event.detail.collection.uid === collection?.uid) {
        setShowSaveAllModal(true);
      }
    };

    window.addEventListener('bruno:open-save-all-modal', handleOpenSaveAllModal);

    return () => {
      window.removeEventListener('bruno:open-save-all-modal', handleOpenSaveAllModal);
    };
  }, [collection]);

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

  const handleSaveAll = () => {
    setShowSaveAllModal(true);
  };

  return (
    <StyledWrapper>
      {showSaveAllModal && (
        <SaveAllModal
          collection={collection}
          onClose={() => setShowSaveAllModal(false)}
        />
      )}
      <div className="flex items-center p-2">
        <div className="flex flex-1 items-center cursor-pointer hover:underline" onClick={viewCollectionSettings}>
          <IconFiles size={18} strokeWidth={1.5} />
          <span className="ml-2 mr-4 font-semibold">{collection?.name}</span>
        </div>
        <div className="flex flex-3 items-center justify-end">
          <span className="mr-2">
            <JsSandboxMode collection={collection} />
          </span>
          {draftCount > 0 && (
            <span className="mr-3">
              <ToolHint text="Save All Requests (⌘⇧S)" toolhintId="SaveAllToolhintId" place="bottom">
                <div className="relative cursor-pointer" onClick={handleSaveAll}>
                  <IconDeviceFloppy size={18} strokeWidth={1.5} className="text-yellow-600" />
                  <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-semibold">
                    {draftCount}
                  </span>
                </div>
              </ToolHint>
            </span>
          )}
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
            <EnvironmentSelector collection={collection} />
          </span>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CollectionToolBar;
