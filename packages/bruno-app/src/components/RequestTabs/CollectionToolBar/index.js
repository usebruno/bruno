import React from 'react';
import { uuid } from 'utils/common';
import EnvironmentSelector from 'components/Environments/EnvironmentSelector';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { Eye, Layers, Settings } from 'lucide-react';
import { Runner } from 'components/Icons/Runner';

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
        <div className="flex flex-1 items-center cursor-pointer hover:underline" onClick={viewCollectionSettings}>
          <Layers size={18} />
          <span className="ml-2 mr-4 font-semibold">{collection.name}</span>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <button className="mr-2 dark:hover:text-white hover:text-slate-950" onClick={handleRun}>
            <Runner size={20} strokeWidth={1.5} />
          </button>
          <button className="mr-3 dark:hover:text-white hover:text-slate-950" onClick={viewVariables}>
            <Eye size={18} strokeWidth={1.5} />
          </button>
          <button className="mr-3 dark:hover:text-white hover:text-slate-950" onClick={viewCollectionSettings}>
            <Settings className="cursor-pointer" size={18} strokeWidth={1.5} />
          </button>
          <EnvironmentSelector collection={collection} />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CollectionToolBar;
