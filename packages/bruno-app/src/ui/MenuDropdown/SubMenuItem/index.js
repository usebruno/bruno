import React, { useState } from 'react';
import { IconChevronRight, IconChevronLeft } from '@tabler/icons';

const SubMenuItem = ({
  item,
  selectedItemId,
  showTickMark,
  onRootClose,
  submenuPlacement,
  getMenuItemProps,
  renderMenuItemContent,
  MenuDropdownComponent
}) => {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const isLeftPlacement = submenuPlacement === 'left';
  const submenuTippyPlacement = isLeftPlacement ? 'left-start' : 'right-start';
  const ArrowIcon = isLeftPlacement ? IconChevronLeft : IconChevronRight;

  const submenuItemsWithClose = item.submenu.map((subItem) => {
    if (subItem.type === 'divider') return subItem;
    return {
      ...subItem,
      onClick: () => {
        subItem.onClick?.();
        onRootClose();
      }
    };
  });

  const hasSelectedChild = selectedItemId != null
    && item.submenu.some((subItem) => subItem.id === selectedItemId);

  const itemProps = getMenuItemProps(item, {
    'className': `has-submenu ${hasSelectedChild ? 'dropdown-item-active' : ''}`,
    'aria-haspopup': 'true',
    'aria-expanded': submenuOpen,
    'aria-current': hasSelectedChild ? 'true' : undefined
  });

  const arrowElement = (
    <span className="submenu-arrow">
      <ArrowIcon size={14} />
    </span>
  );

  return (
    <div
      className="submenu-trigger"
      onMouseEnter={() => setSubmenuOpen(true)}
      onMouseLeave={() => setSubmenuOpen(false)}
    >
      <MenuDropdownComponent
        items={submenuItemsWithClose}
        placement={submenuTippyPlacement}
        opened={submenuOpen}
        onChange={setSubmenuOpen}
        selectedItemId={selectedItemId}
        showTickMark={showTickMark}
        submenuPlacement={submenuPlacement}
        appendTo={() => document.body}
        offset={[0, 0]}
      >
        <div {...itemProps}>
          {renderMenuItemContent(item, arrowElement)}
        </div>
      </MenuDropdownComponent>
    </div>
  );
};

export default SubMenuItem;
