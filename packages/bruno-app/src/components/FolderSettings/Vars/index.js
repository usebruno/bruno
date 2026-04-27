import React, { useRef } from 'react';
import get from 'lodash/get';
import VarsTable from './VarsTable';
import StyledWrapper from './StyledWrapper';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import Button from 'ui/Button';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';

const Vars = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const requestVars = folder.draft ? get(folder, 'draft.request.vars.req', []) : get(folder, 'root.request.vars.req', []);
  const responseVars = folder.draft ? get(folder, 'draft.request.vars.res', []) : get(folder, 'root.request.vars.res', []);
  const handleSave = () => dispatch(saveFolderRoot(collection.uid, folder.uid));

  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `folder-vars-scroll-${folder.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.folder-settings-content', onChange: setScroll, initialValue: scroll });

  return (
    <StyledWrapper className="w-full flex flex-col" ref={wrapperRef}>
      <div>
        <div className="mb-3 title text-xs">Pre Request</div>
        <VarsTable folder={folder} collection={collection} vars={requestVars} varType="request" initialScroll={scroll} />
      </div>
      <div>
        <div className="mt-3 mb-3 title text-xs">Post Response</div>
        <VarsTable folder={folder} collection={collection} vars={responseVars} varType="response" initialScroll={scroll} />
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
