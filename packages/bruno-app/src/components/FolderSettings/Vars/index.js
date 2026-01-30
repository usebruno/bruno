import React from 'react';
import get from 'lodash/get';
import VarsTable from './VarsTable';
import StyledWrapper from './StyledWrapper';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import Button from 'ui/Button';

const Vars = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const requestVars = folder.draft ? get(folder, 'draft.request.vars.req', []) : get(folder, 'root.request.vars.req', []);
  const responseVars = folder.draft ? get(folder, 'draft.request.vars.res', []) : get(folder, 'root.request.vars.res', []);
  const handleSave = () => dispatch(saveFolderRoot(collection.uid, folder.uid));

  return (
    <StyledWrapper className="w-full flex flex-col">
      <div>
        <div className="mb-3 title text-xs">Pre Request</div>
        <VarsTable folder={folder} collection={collection} vars={requestVars} varType="request" />
      </div>
      <div>
        <div className="mt-3 mb-3 title text-xs">Post Response</div>
        <VarsTable folder={folder} collection={collection} vars={responseVars} varType="response" />
      </div>
      <div className="mt-6">
        <Button type="submit" size="sm" onClick={handleSave}>
          Save
        </Button>
      </div>
    </StyledWrapper>
  );
};

export default Vars;
