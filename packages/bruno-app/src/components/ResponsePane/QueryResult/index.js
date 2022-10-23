import React from 'react';
import CodeEditor from 'components/CodeEditor';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';

const QueryResult = ({ value, width }) => {
  const {
    storedTheme
  } = useTheme();

  return (
    <StyledWrapper className="px-3 w-full" style={{ maxWidth: width }}>
      <div className="h-full">
        <CodeEditor theme={storedTheme} value={value || ''} readOnly />
      </div>
    </StyledWrapper>
  );
};

export default QueryResult;
