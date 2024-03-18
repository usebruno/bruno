import React from 'react';
import get from 'lodash/get';
import VarsTable from './VarsTable';
import StyledWrapper from './StyledWrapper';
import { uuid } from 'utils/common';

const Vars = ({ item, collection }) => {
  const requestVars = item?.draft ? get(item, 'draft.request.vars.req') : get(item, 'request.vars.req');
  const responseVars = item?.draft ? get(item, 'draft.request.vars.res') : get(item, 'request.vars.res');
  const mappedVariables = Object.entries(collection.collectionVariables || {}).map(([key, value]) => {
    return {
      name: key,
      uid: uuid(),
      value: typeof value === 'string' ? value : JSON.stringify(value)
    };
  });
  return (
    <StyledWrapper className="w-full flex flex-col">
      <div className="flex-1 mt-2">
        {mappedVariables.length > 0 ? (
          <VarsTable collection={collection} vars={mappedVariables} varType="request" readOnly />
        ) : (
          <div className="mb-1 title text-xs">No Collection Variables</div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default Vars;
