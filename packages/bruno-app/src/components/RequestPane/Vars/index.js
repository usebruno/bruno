import React from 'react';
import get from 'lodash/get';
import VarsTable from './VarsTable';
import StyledWrapper from './StyledWrapper';
import DeprecationWarning from 'components/DeprecationWarning';

const Vars = ({ item, collection }) => {
  const requestVars = item.draft ? get(item, 'draft.request.vars.req') : get(item, 'request.vars.req');
  const responseVars = item.draft ? get(item, 'draft.request.vars.res') : get(item, 'request.vars.res');

  return (
    <StyledWrapper className="w-full flex flex-col">
      <div className="mt-2">
        <VarsTable item={item} collection={collection} vars={requestVars} varType="request" />
      </div>
    </StyledWrapper>
  );
};

export default Vars;
