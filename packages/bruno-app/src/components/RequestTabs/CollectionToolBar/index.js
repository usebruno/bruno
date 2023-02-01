import React from 'react';
import { IconFiles, IconRun } from '@tabler/icons';
import EnvironmentSelector from 'components/Environments/EnvironmentSelector';
import VariablesView from 'components/VariablesView';
import { useDispatch } from 'react-redux';
import { toggleRunnerView } from 'providers/ReduxStore/slices/collections';
import StyledWrapper from './StyledWrapper';

const CollectionToolBar = ({ collection }) => {
  const dispatch = useDispatch();

  const handleRun = () => {
    dispatch(toggleRunnerView({
      collectionUid: collection.uid
    }));
  };

  return (
    <StyledWrapper>
      <div className="flex items-center p-2">
        <div className="flex flex-1 items-center">
          <IconFiles size={18} strokeWidth={1.5} />
          <span className="ml-2 mr-4 font-semibold">{collection.name}</span>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <span className="mr-2">
            <IconRun className="cursor-pointer" size={20} strokeWidth={1.5} onClick={handleRun} />
          </span>
          <VariablesView collection={collection}/>
          <EnvironmentSelector collection={collection} />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CollectionToolBar;
