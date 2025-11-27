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
        <div className="mb-1 title text-xs">Pre Request</div>
        <VarsTable item={item} collection={collection} vars={requestVars} varType="request" />
      </div>
      <div>
        <div className="mt-1 mb-1 title text-xs">Post Response</div>
        <DeprecationWarning>
          Post Response Variables will be removed in <strong>v3.0.0</strong>. They are deprecated and will no longer be supported. Learn more in{' '}
          <a href="https://github.com/usebruno/bruno" target="_blank" rel="noreferrer">this post</a> or contact us at{' '}
          <a href="mailto:support@usebruno.com">support@usebruno.com</a> with questions.
        </DeprecationWarning>
        <VarsTable item={item} collection={collection} vars={responseVars} varType="response" />
      </div>
    </StyledWrapper>
  );
};

export default Vars;
