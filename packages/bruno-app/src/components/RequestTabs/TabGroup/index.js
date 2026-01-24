import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';
import { IconChevronDown, IconChevronRight, IconX, IconPencil, IconPalette } from '@tabler/icons';
import { toggleTabGroupCollapse, deleteTabGroup, renameTabGroup, changeTabGroupColor } from 'providers/ReduxStore/slices/tabs';
import StyledWrapper from './StyledWrapper';
import ActionIcon from 'ui/ActionIcon/index';
import toast from 'react-hot-toast';

const TAB_GROUP_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Indigo', value: '#6366F1' }
];

const TabGroup = ({ group, children, isActive }) => {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef(null);
  const colorPickerRef = useRef(null);
  const colorButtonRef = useRef(null);

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
    if (!showColorPicker && colorButtonRef.current) {
      const rect = colorButtonRef.current.getBoundingClientRect();
      setPickerPosition({
        top: rect.bottom + 8,
        left: rect.right - 130
      });
    }
    setShowColorPicker(!showColorPicker);
  };

  useEffect(() => {
    if (!showColorPicker) return;
    const handleClickOutside = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)
        && colorButtonRef.current && !colorButtonRef.current.contains(e.target)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker]);

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
          <div className="color-picker-container" ref={colorButtonRef}>
            <ActionIcon size="xs" onClick={toggleColorPicker} aria-label="Change Color">
              <IconPalette size={12} />
            </ActionIcon>
            {showColorPicker && createPortal(
              <div
                ref={colorPickerRef}
                style={{
                  position: 'fixed',
                  top: pickerPosition.top,
                  left: pickerPosition.left,
                  zIndex: 10000,
                  background: 'var(--color-background-surface2, #2a2a2a)',
                  border: '1px solid var(--color-border-border1, #3a3a3a)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
                  animation: 'slideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {TAB_GROUP_COLORS.map((color) => (
                  <button
                    key={color.value}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: group.color === color.value ? '3px solid white' : '3px solid transparent',
                      cursor: 'pointer',
                      backgroundColor: color.value,
                      position: 'relative',
                      boxShadow: group.color === color.value
                        ? '0 0 0 2px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.25)'
                        : '0 2px 4px rgba(0, 0, 0, 0.15)',
                      transform: group.color === color.value ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColorChange(color.value);
                    }}
                    title={color.name}
                    aria-label={`${color.name} color`}
                    onMouseEnter={(e) => {
                      if (group.color !== color.value) {
                        e.currentTarget.style.transform = 'scale(1.15) translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (group.color !== color.value) {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
                      }
                    }}
                  />
                ))}
              </div>,
              document.body
            )}
          </div>
          <ActionIcon size="xs" onClick={handleDeleteGroup} aria-label="Delete Group">
            <IconX size={12} />
          </ActionIcon>
        </div>
      </div>
      {!group.collapsed && (
        <div
          className="tab-group-tabs"
          style={{
            animation: 'expandTabs 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {children}
        </div>
      )}
    </StyledWrapper>
  );
};

export default TabGroup;
