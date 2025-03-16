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
      <div className="path-display w-full mt-2">
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <div className="flex items-center gap-1">
            {hasExtension ? <IconFile size={16} className="text-gray-500" /> : <IconFolder size={16} className="text-gray-500" />} 
          </div>
          {pathSegments?.map((segment, index) => (
            <div key={index} className="flex items-center gap-1">
              <span className="text-gray-400">/</span>
              <span>{segment}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            {pathSegments?.length ? <span className="text-gray-400">/</span> : null}
            <span className="filename">
              {baseName}
            </span>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default PathDisplay;