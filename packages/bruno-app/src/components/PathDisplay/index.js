import React from 'react';
import { IconFolder, IconFile } from '@tabler/icons';
import path from 'utils/common/path';
import StyledWrapper from './StyledWrapper';

const PathDisplay = ({ 
  collection,
  dirName = '',
  baseName = ''
}) => {
  const extName = path.extname(baseName)
  const hasExtension = Boolean(extName);
  const pathSegments = dirName?.split(path.sep).filter(Boolean);

  return (
    <StyledWrapper>
        <div className="path-display mt-2">
        <div className="path-layout flex font-mono">
          <div className="icon-column flex">
            {hasExtension ? <IconFile size={16} /> : <IconFolder size={16} />} 
          </div>
          {collection?.name && (
            <div className="path-segment collection-segment">
              {collection.name}
              <span className="separator">/</span>
            </div>
          )}
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