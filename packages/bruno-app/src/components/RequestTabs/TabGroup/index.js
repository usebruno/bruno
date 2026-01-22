import React, { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { IconChevronDown, IconChevronRight, IconX, IconPencil, IconPalette } from '@tabler/icons';
import { toggleTabGroupCollapse, deleteTabGroup, renameTabGroup, changeTabGroupColor } from 'providers/ReduxStore/slices/tabs';
import StyledWrapper from './StyledWrapper';
import ActionIcon from 'ui/ActionIcon/index';
import toast from 'react-hot-toast';

const TAB_GROUP_COLORS = [
  { name: 'Blue', value: '#5B9BD5' },
  { name: 'Red', value: '#E15759' },
  { name: 'Green', value: '#70AD47' },
  { name: 'Yellow', value: '#FFC000' },
  { name: 'Purple', value: '#9D65C9' },
  { name: 'Orange', value: '#F4B183' },
  { name: 'Pink', value: '#F06292' },
  { name: 'Teal', value: '#4DB6AC' },
  { name: 'Gray', value: '#A5A5A5' }
];

const TabGroup = ({ group, children, isActive }) => {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef(null);
  const colorPickerRef = useRef(null);

  const handleToggleCollapse = (e) => {
    e.stopPropagation();
    dispatch(toggleTabGroupCollapse({ groupId: group.id }));
  };

  const handleDeleteGroup = (e) => {
    e.stopPropagation();
    dispatch(deleteTabGroup({ groupId: group.id }));
    toast.success('Tab group deleted');
  };

  const handleStartEdit = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSaveEdit = () => {
    if (groupName.trim()) {
      dispatch(renameTabGroup({ groupId: group.id, name: groupName.trim() }));
      setIsEditing(false);
    } else {
      setGroupName(group.name);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setGroupName(group.name);
      setIsEditing(false);
    }
  };

  const handleColorChange = (color) => {
    dispatch(changeTabGroupColor({ groupId: group.id, color: color }));
    setShowColorPicker(false);
  };

  const toggleColorPicker = (e) => {
    e.stopPropagation();
    setShowColorPicker(!showColorPicker);
  };

  return (
    <StyledWrapper groupColor={group.color} isActive={isActive}>
      <div className="tab-group-header">
        <div className="tab-group-header-left" onClick={handleToggleCollapse}>
          <ActionIcon size="xs" aria-label="Toggle Group">
            {group.collapsed ? <IconChevronRight size={14} /> : <IconChevronDown size={14} />}
          </ActionIcon>
          <div className="tab-group-line" style={{ backgroundColor: group.color }} />
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              className="tab-group-name-input"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="tab-group-name">{group.name}</span>
          )}
        </div>
        <div className="tab-group-actions">
          <ActionIcon size="xs" onClick={handleStartEdit} aria-label="Rename Group">
            <IconPencil size={12} />
          </ActionIcon>
          <div className="color-picker-container">
            <ActionIcon size="xs" onClick={toggleColorPicker} aria-label="Change Color">
              <IconPalette size={12} />
            </ActionIcon>
            {showColorPicker && (
              <div ref={colorPickerRef} className="color-picker-dropdown">
                {TAB_GROUP_COLORS.map((color) => (
                  <button
                    key={color.value}
                    className="color-option"
                    style={{ backgroundColor: color.value }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColorChange(color.value);
                    }}
                    title={color.name}
                  />
                ))}
              </div>
            )}
          </div>
          <ActionIcon size="xs" onClick={handleDeleteGroup} aria-label="Delete Group">
            <IconX size={12} />
          </ActionIcon>
        </div>
      </div>
      {!group.collapsed && <div className="tab-group-tabs">{children}</div>}
    </StyledWrapper>
  );
};

export default TabGroup;
