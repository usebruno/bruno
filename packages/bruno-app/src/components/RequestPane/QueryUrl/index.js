import React from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { requestUrlChanged, updateRequestMethod } from 'providers/ReduxStore/slices/collections';
import HttpMethodSelector from './HttpMethodSelector';
import { useTheme } from 'providers/Theme';
import SendIcon from 'components/Icons/Send';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';

const QueryUrl = ({ item, collection, handleRun }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const method = item.draft ? get(item, 'draft.request.method') : get(item, 'request.method');
  const url = item.draft ? get(item, 'draft.request.url') : get(item, 'request.url');

  const onUrlChange = (value) => {
    dispatch(
      requestUrlChanged({
        itemUid: item.uid,
        collectionUid: collection.uid,
        url: value
      })
    );
  };

  const onMethodSelect = (verb) => {
    dispatch(
      updateRequestMethod({
        method: verb,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  return (
    <StyledWrapper className="flex items-center">
      <div className="flex items-center h-full method-selector-container">
        <HttpMethodSelector method={method} onMethodSelect={onMethodSelect} />
      </div>
      <div className="flex items-center flex-grow input-container h-full">
        <SingleLineEditor 
          value={url} 
          onChange={(newValue) => onUrlChange(newValue)}
          collection={collection}
        />
        <div className="flex items-center h-full mr-2 cursor-pointer" id="send-request" onClick={handleRun}>
          <SendIcon color={theme.requestTabPanel.url.icon} width={22}/>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default QueryUrl;
