import React from 'react';
import { uuid } from 'utils/common';
import { IconFiles, IconRun, IconEye } from '@tabler/icons';
import EnvironmentSelector from 'components/Environments/EnvironmentSelector';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { useDispatch } from 'react-redux';
import { toggleRunnerView } from 'providers/ReduxStore/slices/collections';
import StyledWrapper from './StyledWrapper';

const CollectionToolBar = ({ collection }) => {
  const dispatch = useDispatch();

  const handleRun = () => {
    dispatch(
      toggleRunnerView({
        collectionUid: collection.uid
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
          <span className="mr-3">
            <IconEye className="cursor-pointer" size={18} strokeWidth={1.5} onClick={viewVariables} />
          </span>
          <EnvironmentSelector collection={collection} />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CollectionToolBar;
