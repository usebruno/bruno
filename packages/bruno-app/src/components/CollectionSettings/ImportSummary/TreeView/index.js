import React, { useState } from 'react';
import { IconChevronRight, IconFolder, IconApi } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const TreeItem = ({ item, depth, onRequestClick, onFolderClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = (e) => {
    setIsExpanded(!isExpanded);
    // Prevent folder click when toggling expansion
    e.stopPropagation();
  };

  const handleClick = () => {
    if (item.type === 'folder') {
      onFolderClick(item);
    } else {
      onRequestClick(item);
    }
  };

  const paddingLeft = depth * 20;

  if (item.type === 'folder') {
    return (
      <div>
        <div 
          className="tree-item" 
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={handleClick}
        >
          <span 
            className={`chevron ${isExpanded ? 'expanded' : ''}`}
            onClick={handleToggle}
          >
            <IconChevronRight size={16} strokeWidth={1.5} />
          </span>
          <IconFolder size={16} className="text-yellow-600" stroke={1.5} />
          <span className="ml-2">{item.name}</span>
          {item.items?.length > 0 && (
            <span className="count">({item.items.length})</span>
          )}
        </div>
        {isExpanded && item.items?.map((child, index) => (
          <TreeItem 
            key={index} 
            item={child} 
            depth={depth + 1} 
            onRequestClick={onRequestClick}
            onFolderClick={onFolderClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div 
      className="tree-item" 
      style={{ paddingLeft: `${paddingLeft}px` }}
      onClick={handleClick}
    >
      <IconApi size={16} className="text-blue-600" stroke={1.5} />
      <span className="ml-2">{item.name}</span>
      <span className="method-label">
        {item.request?.method || 'GET'}
      </span>
    </div>
  );
};

const TreeView = ({ items, onRequestClick, onFolderClick }) => {
  return (
    <StyledWrapper>
      <div className="text-sm font-medium mb-2">Collection Structure</div>
      <div className="tree-container">
        {items?.map((item, index) => (
          <TreeItem 
            key={index} 
            item={item} 
            depth={0} 
            onRequestClick={onRequestClick}
            onFolderClick={onFolderClick}
          />
        ))}
      </div>
    </StyledWrapper>
  );
};

export default TreeView;