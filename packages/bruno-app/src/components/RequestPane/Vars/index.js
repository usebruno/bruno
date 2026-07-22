import React, { useRef } from 'react';
import get from 'lodash/get';
import VarsTable from './VarsTable';
import FinalVarsTable from './FinalVarsTable';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';

const Vars = ({ item, collection }) => {
  const [showFinalVars, setShowFinalVars] = React.useState(false);
  const requestVars = item.draft ? get(item, 'draft.request.vars.req') : get(item, 'request.vars.req');
  const responseVars = item.draft ? get(item, 'draft.request.vars.res') : get(item, 'request.vars.res');

  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `request-vars-scroll-${item.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.flex-boundary', onChange: setScroll, initialValue: scroll });

  return (
    <StyledWrapper className="w-full flex flex-col" ref={wrapperRef}>
      <div>
        <div className="mb-3 title text-xs">Pre Request</div>
        <VarsTable item={item} collection={collection} vars={requestVars} varType="request" initialScroll={scroll} />
      </div>
      <div>
        <div className="mt-3 mb-3 title text-xs">Post Response</div>
        <VarsTable item={item} collection={collection} vars={responseVars} varType="response" initialScroll={scroll} />
      </div>
      <hr/>
      <div>
        <div className="mt-2 mb-1 flex items-center justify-between mb-2">
          <div className="title text-xs">Final Variables (All Sources)</div>
          <button
            className="text-xs text-blue-600 hover:text-blue-800 underline"
            onClick={() => setShowFinalVars(!showFinalVars)}
          >
            {showFinalVars ? 'Hide' : 'Show'}
          </button>
        </div>
        {showFinalVars && <FinalVarsTable item={item} collection={collection} />}
      </div>
    </StyledWrapper>
  );
};

export default Vars;
