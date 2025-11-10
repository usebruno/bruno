import React, { useState, useRef, useEffect } from 'react';
import { IconPlus, IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const BodyTabs = ({ tabs, activeTabId, onTabChange, onAddTab, onTabRename, onTabClose, children }) => {
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleDoubleClick = tab => {
    setEditingTabId(tab.id);
    setEditingName(tab.title);
  };

  const handleRenameSubmit = () => {
    if (editingName.trim() && onTabRename) {
      onTabRename(editingTabId, editingName.trim());
    }
    setEditingTabId(null);
    setEditingName('');
  };

  const handleRenameCancel = () => {
    setEditingTabId(null);
    setEditingName('');
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    if (onTabClose) {
      onTabClose(tabId);
    }
  };

  return (
    <StyledWrapper className="w-full h-full flex flex-col">
      <div className="flex items-center body-tabs-header">
        <div className="tabs-container">
          <div className="tabs-list">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`body-tab ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => onTabChange(tab.id)}
                onDoubleClick={() => handleDoubleClick(tab)}
              >
                {editingTabId === tab.id ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={handleKeyDown}
                    className="tab-rename-input"
                  />
                ) : (
                  <>
                    <span className="tab-title">{tab.title}</span>
                    <button
                      className="tab-close-btn"
                      onClick={e => handleCloseTab(e, tab.id)}
                      title="Close tab"
                      style={{ display: tabs.length > 1 ? 'flex' : 'none' }}
                    >
                      <IconX size={12} strokeWidth={2} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <button className="add-tab-btn flex items-center justify-center" onClick={onAddTab} title="Add new body tab">
            <IconPlus size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="body-tab-content flex-1">{children}</div>
    </StyledWrapper>
  );
};

export default BodyTabs;
