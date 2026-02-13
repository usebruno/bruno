import React, { useState } from 'react';
import { IconChevronRight, IconChevronLeft } from '@tabler/icons';

const SubMenuItem = ({
  item,
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

  const itemProps = getMenuItemProps(item, {
    'className': 'has-submenu',
    'aria-haspopup': 'true',
    'aria-expanded': submenuOpen,
    'aria-current': undefined // submenu triggers don't need aria-current
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
        showTickMark={false}
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
