import React from 'react';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';

const QueryResult = ({value, width}) => {
  return (
    <StyledWrapper className="mt-4 px-3 w-full" style={{maxWidth: width}}>
      <div className="h-full">
        <CodeEditor value={value || ''} />
      </div>
    </StyledWrapper>
  );
};

export default QueryResult;
