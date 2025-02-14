import React, { useState } from 'react';
import { IconChevronRight, IconFolder, IconApi } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const TreeItem = ({ item, depth, onRequestClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleClick = () => {
    console.log('item', item);
    // if (item.type === 'request') {
        console.log('item', item);
      onRequestClick(item);
    // }
  };

  const paddingLeft = depth * 20;

  if (item.type === 'folder') {
    return (
      <div>
        <div 
          className="tree-item" 
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={handleToggle}
        >
          <span className={`chevron ${isExpanded ? 'expanded' : ''}`}>
            <IconChevronRight size={16} strokeWidth={1.5} />
          </span>
          <IconFolder size={16} className="text-yellow-600" stroke={1.5} />
          <span className="ml-2">{item.name}</span>
          {item.items?.length > 0 && (
            <span className="count">({item.items.length})</span>
          )}
        </div>
        {isExpanded && item.items?.map((child, index) => (
          <TreeItem key={index} item={child} depth={depth + 1} onRequestClick={onRequestClick} />
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

const TreeView = ({ collection, onRequestClick }) => {
  return (
    <StyledWrapper>
      <div className="text-sm font-medium mb-2">Collection Structure</div>
      <div className="tree-container">
        {collection.items?.map((item, index) => (
          <TreeItem key={index} item={item} depth={0} onRequestClick={onRequestClick} />
        ))}
      </div>
    </StyledWrapper>
  );
};

export default TreeView;