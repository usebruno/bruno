import React from 'react';
import get from 'lodash/get';
import VarsTable from './VarsTable';
import EffectiveVarsTable from './EffectiveVarsTable';
import StyledWrapper from './StyledWrapper';

const Vars = ({ item, collection }) => {
  const requestVars = item.draft ? get(item, 'draft.request.vars.req') : get(item, 'request.vars.req');
  const responseVars = item.draft ? get(item, 'draft.request.vars.res') : get(item, 'request.vars.res');

  return (
    <StyledWrapper className="w-full flex flex-col">
      <div>
        <div className="mb-3 title text-xs">Pre Request</div>
        <VarsTable item={item} collection={collection} vars={requestVars} varType="request" />
      </div>
      <div>
        <div className="mt-3 mb-3 title text-xs">Post Response</div>
        <VarsTable item={item} collection={collection} vars={responseVars} varType="response" />
      </div>
      <div>
        <div className="mt-3 mb-3 title text-xs">
          Effective Variables
          <span className="ml-2 text-xs font-normal opacity-70">
            Request &gt; Folder &gt; Environment &gt; Collection
          </span>
        </div>
        <EffectiveVarsTable item={item} collection={collection} />
      </div>
    </StyledWrapper>
  );
};

export default Vars;
