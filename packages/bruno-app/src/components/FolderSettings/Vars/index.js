import React from 'react';
import get from 'lodash/get';
import VarsTable from './VarsTable';
import StyledWrapper from './StyledWrapper';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';

const Vars = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const requestVars = folder.draft ? get(folder, 'draft.request.vars.req', []) : get(folder, 'root.request.vars.req', []);
  const handleSave = () => dispatch(saveFolderRoot(collection.uid, folder.uid));

  return (
    <StyledWrapper className="w-full flex flex-col">
      <div className="flex-1 mt-2">
        <VarsTable folder={folder} collection={collection} vars={requestVars} varType="request" />
      </div>
      <div className="mt-6">
        <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
          Save
        </button>
      </div>
    </StyledWrapper>
  );
};

export default Vars;
