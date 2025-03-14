import React from 'react';
import { IconEdit, IconFolder, IconFile } from '@tabler/icons';
import path from 'utils/common/path';
import StyledWrapper from './StyledWrapper';

const PathDisplay = ({ 
  collection, 
  item, 
  filename,
  extension = '.bru', 
  showExtension = true,
  toggleEditingFilename,
  showDirectory = false
}) => {
  const relativePath = item?.pathname && path.relative(collection?.pathname, showDirectory ? path.dirname(item?.pathname) : item?.pathname);
  const pathSegments = relativePath?.split(path.sep).filter(Boolean);

  return (
    <StyledWrapper>
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block font-semibold">Location Path</label>
          <IconEdit 
            className="cursor-pointer opacity-50 hover:opacity-80" 
            size={16} 
            strokeWidth={1.5} 
            onClick={() => toggleEditingFilename(true)} 
          />
        </div>
        <div className="path-display">
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <div className="flex items-center gap-1">
              {showExtension ? <IconFile size={16} className="text-gray-500" /> : <IconFolder size={16} className="text-gray-500" />} 
              <span className="font-medium">{collection?.name}</span>
            </div>
            {pathSegments?.length > 0 && pathSegments?.map((segment, index) => (
              <div key={index} className="flex items-center gap-1">
                <span className="text-gray-400">/</span>
                <span>{segment}</span>
              </div>
            ))}
            <div className="flex items-center gap-1">
              {collection && <span className="text-gray-400">/</span>}
              <span className="filename">
                {filename}
                {showExtension && filename?.length ? (
                  <span className="file-extension">{extension}</span>
                ) : null}
              </span>
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default PathDisplay;