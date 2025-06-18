import React from 'react';
import { IconFolder, IconFile } from '@tabler/icons';
import path from 'utils/common/path';
import StyledWrapper from './StyledWrapper';

const PathDisplay = ({ 
  baseName = '',
  iconType = 'file'
}) => {
  return (
    <StyledWrapper>
        <div className="path-display mt-2">
        <div className="path-layout flex font-mono">
          <div className="icon-column flex">
            {iconType === 'file' ? <IconFile size={16} /> : <IconFolder size={16} />} 
          </div>
          <span className="name-container">
            {baseName}
          </span>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default PathDisplay;