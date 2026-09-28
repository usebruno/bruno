import React from 'react';
import MenuDropdown from 'ui/MenuDropdown';

/**
 * ContextMenu - A point-anchored MenuDropdown for cursor-based context menus.
 *
 * Uses an invisible anchor positioned at the cursor, keeping point-anchoring
 * and open/close behavior centralized for menus such as sidebar bulk actions
 * and environment list context menus.
 *
 * @param {Object} props
 * @param {boolean} props.visible - Whether the menu is open
 * @param {{x: number, y: number}} props.position - Viewport coordinates for the menu anchor
 * @param {Array} props.items - Menu items forwarded to MenuDropdown
 * @param {function} props.onClose - Called when the menu closes
 * @param {string} [props.placement='right-start'] - Tippy placement
 * @param {string} [props.menuClassName] - Optional className for the menu
 * @param {...*} menuDropdownProps - Additional props forwarded to MenuDropdown
 */
const ContextMenu = ({
  visible,
  position,
  items,
  onClose,
  placement = 'right-start',
  menuClassName,
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
      menuClassName={menuClassName}
      {...menuDropdownProps}
    >
      <div style={anchorStyle} />
    </MenuDropdown>
  );
};

export default ContextMenu;
