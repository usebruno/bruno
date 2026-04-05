import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { IconPlus, IconX } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import StyledWrapper from './StyledWrapper';

const BODY_TAB_DND_TYPE = 'body-tab';

const DraggableBodyTab = ({ id, index, children, onMoveTab, ...rest }) => {
  const ref = useRef(null);

  const [{ isOver }, drop] = useDrop({
    accept: BODY_TAB_DND_TYPE,
    hover(item) {
      if (item.id !== id) {
        onMoveTab(item.id, id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  const [{ isDragging }, drag] = useDrag({
    type: BODY_TAB_DND_TYPE,
    item: () => ({ id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    options: { dropEffect: 'move' }
  });

  drag(drop(ref));

  return (
    <div ref={ref} style={{ opacity: isDragging || isOver ? 0.4 : 1 }} {...rest}>
      {children}
    </div>
  );
};

const BodyTabs = ({ tabs, activeTabId, onTabChange, onAddTab, onTabRename, onTabClose, onReorderTab, onDuplicateTab, onCloseOtherTabs, children }) => {
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef(null);
  const tabListRef = useRef(null);
  const menuDropdownRef = useRef();
  const [contextMenuTabId, setContextMenuTabId] = useState(null);
  const contextMenuAnchorRef = useRef(null);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleDoubleClick = (tab) => {
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

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  const handleTabKeyDown = (e, tabIndex) => {
    let nextIndex;
    if (e.key === 'ArrowRight') {
      nextIndex = (tabIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (tabIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    onTabChange(tabs[nextIndex].id);
    const tabElements = tabListRef.current?.querySelectorAll('[role="tab"]');
    tabElements?.[nextIndex]?.focus();
  };

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    if (onTabClose) {
      onTabClose(tabId);
    }
  };

  const contextMenuRectRef = useRef({ top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 });
  const getContextMenuRect = useCallback(() => contextMenuRectRef.current, []);

  const handleContextMenu = (e, tabId) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuTabId(tabId);
    contextMenuRectRef.current = {
      width: 0,
      height: 0,
      top: e.clientY,
      bottom: e.clientY,
      left: e.clientX,
      right: e.clientX
    };
    menuDropdownRef.current?.show();
  };

  const contextMenuItems = useMemo(() => [
    {
      id: 'rename',
      label: 'Rename',
      onClick: () => {
        const tab = tabs.find((t) => t.id === contextMenuTabId);
        if (tab) handleDoubleClick(tab);
      }
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      onClick: () => {
        if (onDuplicateTab && contextMenuTabId != null) onDuplicateTab(contextMenuTabId);
      }
    },
    { type: 'divider', id: 'divider-1' },
    {
      id: 'close',
      label: 'Close',
      onClick: () => {
        if (onTabClose && contextMenuTabId != null) onTabClose(contextMenuTabId);
      }
    },
    {
      id: 'close-others',
      label: 'Close Others',
      disabled: tabs.length <= 1,
      onClick: () => {
        if (onCloseOtherTabs && contextMenuTabId != null) onCloseOtherTabs(contextMenuTabId);
      }
    }
  ], [contextMenuTabId, tabs, onTabClose, onDuplicateTab, onCloseOtherTabs]);

  return (
    <StyledWrapper className="w-full h-full flex flex-col">
      <div className="flex items-center body-tabs-header">
        <div className="tabs-container">
          <div className="tabs-list" role="tablist" aria-label="Body tabs" ref={tabListRef}>
            {tabs.map((tab, index) => {
              const tabProps = {
                'role': 'tab',
                'aria-selected': activeTabId === tab.id,
                'tabIndex': activeTabId === tab.id ? 0 : -1,
                'className': `body-tab ${activeTabId === tab.id ? 'active' : ''}`,
                'onClick': () => onTabChange(tab.id),
                'onDoubleClick': () => handleDoubleClick(tab),
                'onKeyDown': (e) => handleTabKeyDown(e, index),
                'onContextMenu': (e) => handleContextMenu(e, tab.id)
              };

              const tabContent = editingTabId === tab.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={handleRenameKeyDown}
                  className="tab-rename-input"
                />
              ) : (
                <>
                  <span className="tab-title">{tab.title}</span>
                  <button
                    className="tab-close-btn"
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    title="Close tab"
                    tabIndex={-1}
                    style={{ display: tabs.length > 1 ? 'flex' : 'none' }}
                  >
                    <IconX size={12} strokeWidth={2} />
                  </button>
                </>
              );

              if (onReorderTab) {
                return (
                  <DraggableBodyTab key={tab.id} id={tab.id} index={index} onMoveTab={onReorderTab} {...tabProps}>
                    {tabContent}
                  </DraggableBodyTab>
                );
              }

              return (
                <div key={tab.id} {...tabProps}>
                  {tabContent}
                </div>
              );
            })}
          </div>
          <button className="add-tab-btn flex items-center justify-center" onClick={onAddTab} title="Add new body tab">
            <IconPlus size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="body-tab-content flex-1" role="tabpanel">{children}</div>
      <MenuDropdown
        ref={menuDropdownRef}
        items={contextMenuItems}
        placement="bottom-start"
        appendTo={document.body}
        getReferenceClientRect={getContextMenuRect}
      >
        <span></span>
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default BodyTabs;
