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
        <div className="flex items-center h-full mr-2 cursor-pointer" onClick={handleRun}>
          <img src='/send.svg' style={{width: '22px'}}/>
        </div>
      </div>
    </StyledWrapper>
  )
};

export default QueryUrl;
