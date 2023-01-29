import React from 'react';
import StyledWrapper from './StyledWrapper';

const VariablesTable = ({ variables }) => {
  return (
    <StyledWrapper>
      <div className="flex flex-col w-full">
        {(variables && variables.length) ? variables.map((variable) => {
          return (
            <div key={variable.uid} className="flex">
              <div className='variable-name text-yellow-600 text-right pr-2'>{variable.name}</div>
              <div className='variable-value pl-2 whitespace-normal text-left flex-grow'>{variable.value}</div>
            </div>
          );
        }) : null}
      </div>
    </StyledWrapper>
  );
};

export default VariablesTable;
