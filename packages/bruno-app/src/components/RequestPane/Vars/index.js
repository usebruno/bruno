import React, { useRef } from 'react';
import get from 'lodash/get';
import VarsTable from './VarsTable';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';

const Vars = ({ item, collection }) => {
  const isDraft = Boolean(item.draft);
  const requestVars = isDraft ? get(item, 'draft.request.vars.req') : get(item, 'request.vars.req');
  const responseVars = isDraft ? get(item, 'draft.request.vars.res') : get(item, 'request.vars.res');

  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `request-vars-scroll-${item.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.flex-boundary', onChange: setScroll, initialValue: scroll });

  return (
    <StyledWrapper className="w-full flex flex-col" ref={wrapperRef}>
      <div>
        <div className="mb-3 title text-xs">Pre Request</div>
        <VarsTable item={item} collection={collection} vars={requestVars} varType="request" initialScroll={scroll} isDraft={isDraft} />
      </div>
      <div>
        <div className="mt-3 mb-3 title text-xs">Post Response</div>
        <VarsTable item={item} collection={collection} vars={responseVars} varType="response" initialScroll={scroll} isDraft={isDraft} />
      </div>
    </StyledWrapper>
  );
};

export default Vars;
