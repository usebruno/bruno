import React from 'react';
import forOwn from 'lodash/forOwn';
import cloneDeep from 'lodash/cloneDeep';
import { uuid } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const VariablesTable = ({ variables, collectionVariables }) => {
  const collectionVars = [];

  forOwn(cloneDeep(collectionVariables), (value, key) => {
    collectionVars.push({
      uid: uuid(),
      name: key,
      value: value
    });
  });

  return (
    <StyledWrapper>
      <div className="flex flex-col w-full">
        <div className='mb-2 font-medium'>Environment Variables</div>
        {(variables && variables.length) ? variables.map((variable) => {
          return (
            <div key={variable.uid} className="flex">
              <div className='variable-name text-yellow-600 text-right pr-2'>{variable.name}</div>
              <div className='variable-value pl-2 whitespace-normal text-left flex-grow'>{variable.value}</div>
            </div>
          );
        }) : <small>No env variables found</small>}

        <div className='mt-2 font-medium'>Collection Variables</div>
        {(collectionVars && collectionVars.length) ? collectionVars.map((variable) => {
          return (
            <div key={variable.uid} className="flex">
              <div className='variable-name text-yellow-600 text-right pr-2'>{variable.name}</div>
              <div className='variable-value pl-2 whitespace-normal text-left flex-grow'>{variable.value}</div>
            </div>
          );
        }) : <small>No collection variables found</small>}
      </div>
    </StyledWrapper>
  );
};

export default VariablesTable;
