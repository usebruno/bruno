import React from 'react';
import CodeEditor from 'components/CodeEditor';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import { sendRequest } from 'providers/ReduxStore/slices/collections/actions';

import StyledWrapper from './StyledWrapper';

const QueryResult = ({ item, collection, value, width }) => {
  const {
    storedTheme
  } = useTheme();
  const dispatch = useDispatch();

  const onRun = () => dispatch(sendRequest(item, collection.uid));

  return (
    <StyledWrapper className="px-3 w-full" style={{ maxWidth: width }}>
      <div className="h-full">
        <CodeEditor collection={collection} theme={storedTheme} onRun={onRun} value={value || ''} readOnly />
      </div>
    </StyledWrapper>
  );
};

export default QueryResult;
