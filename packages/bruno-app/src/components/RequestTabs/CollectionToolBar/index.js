import React from 'react';
import { uuid } from 'utils/common';
import { IconFiles, IconRun, IconEye, IconSettings } from '@tabler/icons';
import EnvironmentSelector from 'components/Environments/EnvironmentSelector';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';

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
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'collection-settings'
      })
    );
  };

  return (
    <StyledWrapper>
      <div className="flex items-center p-2">
        <div className="flex flex-1 cursor-pointer hover:underline" onClick={viewCollectionSettings}>
          <div className="flex items-center tooltip">
            <IconFiles size={18} strokeWidth={1.5} />
            <span className="ml-2 mr-4 font-semibold">{collection.name}</span>
            <span className="tooltiptext text-xs">Collection</span>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <span className="mr-2">
            <div className="tooltip" onClick={handleRun}>
              <IconRun className="cursor-pointer" size={20} strokeWidth={1.5} />
              <span className="tooltiptext text-xs">Runner</span>
            </div>
          </span>
          <span className="mr-3">
            <div className="tooltip" onClick={viewVariables}>
              <IconEye className="cursor-pointer" size={18} strokeWidth={1.5} />
              <span className="tooltiptext text-xs">Variables</span>
            </div>
          </span>
          <span className="mr-3">
            <div className="tooltip" onClick={viewCollectionSettings}>
              <IconSettings className="cursor-pointer" size={18} strokeWidth={1.5} />
              <span className="tooltiptext text-xs">Collection</span>
            </div>
          </span>
          <EnvironmentSelector collection={collection} />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CollectionToolBar;
