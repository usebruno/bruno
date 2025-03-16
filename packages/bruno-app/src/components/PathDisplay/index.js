import React from 'react';
import { IconFolder, IconFile } from '@tabler/icons';
import path from 'utils/common/path';
import StyledWrapper from './StyledWrapper';

const PathDisplay = ({ 
  dirName = '',
  baseName = ''
}) => {
  const extName = path.extname(baseName)
  const hasExtension = Boolean(extName);
  const pathSegments = dirName?.split(path.sep).filter(Boolean);

  return (
    <StyledWrapper>
        <div className="path-display mt-2">
        <div className="path-layout flex">
          <div className="icon-column flex">
            {hasExtension ? <IconFile size={16} /> : <IconFolder size={16} />} 
          </div>
          {pathSegments?.map((segment, index) => (
            <React.Fragment key={index}>
              <div className="path-segment">
                {segment}
              </div>
              <span className="separator">/</span>
            </React.Fragment>
          ))}
          <span className="filename">
            {baseName}
          </span>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default PathDisplay;