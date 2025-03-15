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
          <label className="block font-medium">Location</label>
          <IconEdit 
            className="cursor-pointer opacity-50 hover:opacity-80" 
            size={16} 
            strokeWidth={1.5} 
            onClick={() => toggleEditingFilename(true)} 
          />
        </div>
        <div className="path-display">
          <div className="path-layout flex">
            <div className="icon-column flex">
              {showExtension ? <IconFile size={16} /> : <IconFolder size={16} />}
            </div>
            <div className="path-container flex font-mono items-center">
              <div className="path-segment collection-segment">
                {collection?.name}
              </div>
              
              {pathSegments?.length > 0 && pathSegments?.map((segment, index) => (
                <React.Fragment key={index}>
                  <span className="separator">/</span>
                  <div className="path-segment">
                    {segment}
                  </div>
                </React.Fragment>
              ))}
              
              {collection && (
                <span className="separator">/</span>
              )}
              
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