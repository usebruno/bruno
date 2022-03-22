import React from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { requestUrlChanged, updateRequestMethod } from 'providers/ReduxStore/slices/collections';
import HttpMethodSelector from './HttpMethodSelector';
import StyledWrapper from './StyledWrapper';

const QueryUrl = ({item, collection, handleRun}) => {
  const dispatch = useDispatch();
  const method = item.draft ? get(item, 'draft.request.method') : get(item, 'request.method');
  let url = item.draft ? get(item, 'draft.request.url') : get(item, 'request.url');

  const onUrlChange = (value) => {
    dispatch(requestUrlChanged({
      itemUid: item.uid,
      collectionUid: collection.uid,
      url: value
    }));
  };

  const onMethodSelect = (verb) => {
    dispatch(updateRequestMethod({
      method: verb,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  return (
    <StyledWrapper className="flex items-center">
      <div className="flex items-center h-full method-selector-container">
        <HttpMethodSelector method={method} onMethodSelect={onMethodSelect}/>
      </div>
      <div className="flex items-center flex-grow input-container h-full">
        <input
          className="px-3 w-full mousetrap"
          type="text" value={url}
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
          onChange={(event) => onUrlChange(event.target.value)}
        />
      </div>
      <button
        style={{backgroundColor: 'var(--color-brand)'}}
        className="flex items-center h-full text-white active:bg-blue-600 font-bold text-xs px-4 py-2 ml-2 uppercase rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150"
        onClick={handleRun}
      >
        <span style={{marginLeft: 5}}>Send</span>
      </button>
    </StyledWrapper>
  )
};

export default QueryUrl;
