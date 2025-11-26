import React from 'react';
import get from 'lodash/get';
import VarsTable from './VarsTable';
import StyledWrapper from './StyledWrapper';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import DeprecationWarning from 'components/DeprecationWarning';

const Vars = ({ collection }) => {
  const dispatch = useDispatch();
  const requestVars = collection.draft?.root ? get(collection, 'draft.root.request.vars.req', []) : get(collection, 'root.request.vars.req', []);
  const responseVars = collection.draft?.root ? get(collection, 'draft.root.request.vars.res', []) : get(collection, 'root.request.vars.res', []);
  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));
  const deprecationWarningMessage = 'Post response vars is deprecated and will be removed in v3.0.0';

  return (
    <StyledWrapper className="w-full flex flex-col">
      <div className="flex-1 mt-2">
        <div className="mb-1 title text-xs">Pre Request</div>
        <VarsTable collection={collection} vars={requestVars} varType="request" />
      </div>
      <div className="flex-1">
        <div className="mt-1 mb-1 title text-xs">Post Response</div>
        <DeprecationWarning message={deprecationWarningMessage} />
        <VarsTable collection={collection} vars={responseVars} varType="response" />
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
