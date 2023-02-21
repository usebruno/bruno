import React from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { updateRequestScript, updateResponseScript } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import VarsTable from './VarsTable';
import StyledWrapper from './StyledWrapper';

const Vars = ({ item, collection }) => {
  const dispatch = useDispatch();
  const requestVars = item.draft ? get(item, 'draft.request.vars.req') : get(item, 'request.vars.req');
  const responseVars = item.draft ? get(item, 'draft.request.vars.res') : get(item, 'request.vars.res');

  const {
    storedTheme
  } = useTheme();

  const onRequestScriptEdit = (value) => {
    dispatch(
      updateRequestScript({
        script: value,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onResponseScriptEdit = (value) => {
    dispatch(
      updateResponseScript({
      script: value,
      itemUid: item.uid,
      collectionUid: collection.uid
    })
  );
};

  const onRun = () => dispatch(sendRequest(item, collection.uid));
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  return (
    <StyledWrapper className="w-full flex flex-col">
      <div className='flex-1 mt-2'>
        <div className='mb-1 title text-xs'>Pre Request</div>
        <VarsTable item={item} collection={collection} vars={requestVars} varType='request'/>
      </div>
      <div className='flex-1'>
        <div className='mt-1 mb-1 title text-xs'>Post Response</div>
        <VarsTable item={item} collection={collection} vars={responseVars} varType='response'/>
      </div>
    </StyledWrapper>
  );
};

export default Vars;
