import React, { useState } from 'react';
import { IconChevronRight, IconFolder, IconApi, IconCode } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import get from 'lodash/get';

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
    } else if (item.type === 'collection-scripts') {
      onRequestClick(item);
    } else {
      onRequestClick(item);
    }
  };

  const paddingLeft = depth * 20;

  if (item.type === 'collection-scripts') {
    return (
      <div 
        className="tree-item" 
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={handleClick}
      >
        <IconCode size={16} className="text-purple-600" stroke={1.5} />
        <span className="ml-2">{item.name}</span>
      </div>
    );
  }

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

const TreeView = ({ items, collection, onRequestClick, onFolderClick }) => {
  const collectionScripts = {
    name: collection?.name || 'Collection Scripts',
    type: 'collection-scripts',
    uid: 'collection-scripts',
    root: {
      request: {
        script: collection?.root?.request?.script || {},
        tests: collection?.root?.request?.tests || ''
      }
    }
  };

  return (
    <StyledWrapper>
      <div className="text-sm font-medium mb-2">Collection Structure</div>
      <div className="tree-container">
        <TreeItem 
          key="collection-scripts" 
          item={collectionScripts} 
          depth={0} 
          onRequestClick={onRequestClick}
          onFolderClick={onFolderClick}
        />
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