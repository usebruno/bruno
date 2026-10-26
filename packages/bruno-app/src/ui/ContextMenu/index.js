import React from 'react';
import MenuDropdown from 'ui/MenuDropdown';

/**
 * Displays a context menu at the cursor position.
 *
 * @param {Object} props
 * @param {boolean} props.visible
 * @param {{x: number, y: number}} props.position - Cursor coordinates relative to the viewport
 * @param {Array} props.items - MenuDropdown items
 * @param {function} props.onClose
 * @param {string} [props.placement='right-start']
 */

const ContextMenu = ({
  visible,
  position,
  items,
  onClose,
  placement = 'right-start',
  ...menuDropdownProps
}) => {
  const anchorStyle = {
    position: 'fixed',
    left: `${position?.x || 0}px`,
    top: `${position?.y || 0}px`,
    width: '1px',
    height: '1px',
    pointerEvents: 'none'
  };

  return (
    <MenuDropdown
      items={items}
      placement={placement}
      opened={visible}
      onChange={(isOpen) => !isOpen && onClose()}
      appendTo={document.body}
      {...menuDropdownProps}
    >
      <div style={anchorStyle} />
    </MenuDropdown>
  );
};

export default ContextMenu;
