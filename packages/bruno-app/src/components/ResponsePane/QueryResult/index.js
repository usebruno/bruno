import React from 'react';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';

const QueryResult = ({ value, width }) => {
  return (
    <StyledWrapper className="px-3 w-full" style={{ maxWidth: width }}>
      <div className="h-full">
        <CodeEditor value={value || ''} readOnly />
      </div>
    </StyledWrapper>
  );
};

export default QueryResult;
