import React from 'react';
import CodeEditor from 'components/CodeEditor';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import { sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { getContentTypeHeader } from 'utils/common';

import StyledWrapper from './StyledWrapper';

const QueryResult = ({ item, collection, value, width, disableRunEventListener, mode }) => {
  const { storedTheme } = useTheme();
  const dispatch = useDispatch();

  const onRun = () => {
    if (disableRunEventListener) {
      return;
    }
    dispatch(sendRequest(item, collection.uid));
  };
  /*var responseType = getContentTypeHeader(item.response.headers);
  let mode = 'application/json';//TODO: What to default??? json probbaly
  if(responseType.includes("xml")){
    mode = "application/xml";
  }*/
  console.log('Mode:' + mode);
  return (
    <StyledWrapper className="px-3 w-full" style={{ maxWidth: width }}>
      <div className="h-full">
        <CodeEditor
          collection={collection}
          theme={storedTheme}
          onRun={onRun}
          value={value || ''}
          mode={mode}
          readOnly
        />
      </div>
    </StyledWrapper>
  );
};

export default QueryResult;
