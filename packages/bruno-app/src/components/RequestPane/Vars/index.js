import React from 'react';
import get from 'lodash/get';
import VarsTable from './VarsTable';
import StyledWrapper from './StyledWrapper';
import DeprecationWarning from 'components/DeprecationWarning';

const Vars = ({ item, collection }) => {
  const requestVars = item.draft ? get(item, 'draft.request.vars.req') : get(item, 'request.vars.req');
  const responseVars = item.draft ? get(item, 'draft.request.vars.res') : get(item, 'request.vars.res');
  const deprecationWarningMessage = 'Post response vars is deprecated and will be removed in v3.0.0';

  return (
    <StyledWrapper className="w-full flex flex-col">
      <div className="mt-2">
        <div className="mb-1 title text-xs">Pre Request</div>
        <VarsTable item={item} collection={collection} vars={requestVars} varType="request" />
      </div>
      <div>
        <div className="mt-1 mb-1 title text-xs">Post Response</div>
        <DeprecationWarning message={deprecationWarningMessage} />
        <VarsTable item={item} collection={collection} vars={responseVars} varType="response" />
      </div>
    </StyledWrapper>
  );
};

export default Vars;
