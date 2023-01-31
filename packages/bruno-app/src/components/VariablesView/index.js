import React, { useState, useRef } from 'react';
import get from 'lodash/get';
import filter from 'lodash/filter';
import { findEnvironmentInCollection } from 'utils/collections';
import VariablesTable from './VariablesTable';
import StyledWrapper from './StyledWrapper';
import PopOver from './Popover';
import { IconEye } from '@tabler/icons';

const VariablesView = ({collection}) => {
  const iconRef = useRef(null);
  const [popOverOpen, setPopOverOpen] = useState(false);

  const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
  const variables = get(environment, 'variables', []);
  const enabledVariables = filter(variables, (variable) => variable.enabled);

  return (
    <StyledWrapper
      className="mr-2 server-syncstatus-icon"
      ref={iconRef}
    >
      <div className="flex p-1 items-center"
        onClick={() => setPopOverOpen(true)}
        onMouseEnter={() => setPopOverOpen(true)}
        onMouseLeave={() => setPopOverOpen(false)}
      >
        <div className='cursor-pointer view-environment'>
          <IconEye size={18} strokeWidth={1.5} />
        </div>
        {popOverOpen && (
          <PopOver
            iconRef={iconRef}
            handleClose={() => setPopOverOpen(false)}
          >
            <div className="px-2 py-1">
              {(enabledVariables && enabledVariables.length) ? <VariablesTable variables={enabledVariables} /> : 'No variables found'}
            </div>
          </PopOver>
        )}
      </div>
    </StyledWrapper>
  )
};

export default VariablesView;