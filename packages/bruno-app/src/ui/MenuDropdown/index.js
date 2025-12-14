import React, { forwardRef, useImperativeHandle } from 'react';
import { useRef, useCallback, useState } from 'react';
import Dropdown from 'components/Dropdown';

// Constants
const NAVIGATION_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'];
const ACTION_KEYS = ['Enter', ' '];

// Calculate next index for keyboard navigation
const getNextIndex = (currentIndex, total, key, noFocus) => {
  if (key === 'Home') return 0;
  if (key === 'End') return total - 1;
  if (key === 'ArrowDown') return noFocus ? 0 : (currentIndex + 1) % total;
  if (key === 'ArrowUp') return noFocus ? total - 1 : (currentIndex - 1 + total) % total;
  return currentIndex;
};

/**
 * MenuDropdown - A reusable dropdown menu component with keyboard navigation
 *
 * @param {Object} props
 * @param {Array} props.items - Array of menu items with structure:
 *   - id: string (unique identifier)
 *   - type: 'item' | 'label' | 'divider' (default: 'item')
 *   - leftSection: React component or React element (rendered on the left side, for items only)
 *   - rightSection: React component or React element (rendered on the right side, for items only)
 *   - label: string (display text for items, or label text for labels; also used for aria-label and title if not provided)
 *   - ariaLabel: string (accessibility label, falls back to label or title if not provided)
 *   - onClick: function (handler when item is clicked, for items only)
 *   - title: string (tooltip text, falls back to label or ariaLabel if not provided)
 *   - testId: string (optional, for testing, for items only)
 *   - disabled: boolean (optional, for items only)
 *   - className: string (optional, additional CSS classes for the item)
 * @param {ReactNode} props.children - The trigger element (button, etc.)
 * @param {string} props.placement - Tippy placement (default: 'bottom-end')
 * @param {string} props.className - Optional className for the dropdown
 * @param {string} props.selectedItemId - Optional ID of the selected/active item to focus on open
 * @param {Object} props.dropdownProps - Other props passed to underlying Dropdown component
 * @param {React.Ref} ref - Optional ref to expose open/close methods
 */
const MenuDropdown = forwardRef(({
  items = [],
  children,
  placement = 'bottom-end',
  className,
  selectedItemId,
  'data-testid': testId = 'menu-dropdown',
  ...dropdownProps
}, ref) => {
  const tippyRef = useRef();
  const [isOpen, setIsOpen] = useState(false);

  // Expose open/close methods via ref
  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev)
  }), []);

  // Get all focusable menu items from the menu dropdown
  const getMenuItems = useCallback(() => {
    const popper = tippyRef.current?.popper;
    if (!popper) return [];

    const menuContainer = popper.querySelector('[role="menu"]');
    if (!menuContainer) return [];

    return Array.from(
      menuContainer.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')
    );
  }, []);

  // Handle item click and close dropdown
  const handleItemClick = useCallback((item) => {
    if (item.disabled) return;
    item.onClick?.();
    setIsOpen(false);
  }, []);

  // Focus a menu item
  const focusMenuItem = (item, addSelectedClass = false) => {
    if (item) {
      // Remove selected class from all items first
      const menuContainer = item.closest('[role="menu"]');
      if (menuContainer) {
        menuContainer.querySelectorAll('.selected-focused').forEach((el) => {
          el.classList.remove('selected-focused');
        });
      }

      if (addSelectedClass) {
        item.classList.add('selected-focused');
      }
      item.focus();
      item.scrollIntoView({ block: 'nearest' });
    }
  };

  // Keyboard navigation handler (handles all keyboard events at menu level)
  const handleMenuKeyDown = useCallback((e) => {
    const itemsToNavigate = getMenuItems();
    if (itemsToNavigate.length === 0) return;

    const currentIndex = itemsToNavigate.findIndex((el) => el === document.activeElement);
    const isNoMenuItemFocused = currentIndex === -1;

    // Handle Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      return;
    }

    // Handle action keys (Enter, Space)
    if (ACTION_KEYS.includes(e.key) && !isNoMenuItemFocused) {
      e.preventDefault();
      e.stopPropagation();
      const currentItem = itemsToNavigate[currentIndex];
      const itemId = currentItem?.getAttribute('data-item-id');
      const item = items.find((i) => i.id === itemId);
      if (item && !item.disabled) {
        handleItemClick(item);
      }
      return;
    }

    // Handle navigation keys
    if (NAVIGATION_KEYS.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      const nextIndex = getNextIndex(currentIndex, itemsToNavigate.length, e.key, isNoMenuItemFocused);
      focusMenuItem(itemsToNavigate[nextIndex], false);
    }
  }, [getMenuItems, items, handleItemClick]);

  // Toggle dropdown visibility
  const handleTriggerClick = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Close dropdown when clicking outside
  const handleClickOutside = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Setup Tippy instance
  const onDropdownCreate = useCallback((ref) => {
    tippyRef.current = ref;
    if (ref) {
      ref.setProps({
        onShow: () => {
          // Focus selected item if available, otherwise focus menu container
          setTimeout(() => {
            const menuContainer = ref.popper?.querySelector('[role="menu"]');
            if (!menuContainer) return;

            // If selectedItemId is provided, find and focus that item
            if (selectedItemId) {
              const menuItems = Array.from(
                menuContainer.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')
              );

              const selectedItem = menuItems.find(
                (item) => item.getAttribute('data-item-id') === selectedItemId
              );

              if (selectedItem) {
                focusMenuItem(selectedItem, true);
                return;
              }
            }

            // Fallback: focus menu container
            menuContainer.focus();
          }, 0);
        }
      });
    }
  }, [selectedItemId]);

  // Render section (left or right)
  const renderSection = (section) => {
    if (!section) return null;

    // If it's a React component (function), render it with default icon props
    if (typeof section === 'function') {
      const SectionComponent = section;
      return <SectionComponent size={16} stroke={1.5} className="dropdown-icon" aria-hidden="true" />;
    }

    // If it's already a React element, render it as-is
    return section;
  };

  // Render menu item
  const renderMenuItem = (item) => {
    return (
      <div
        key={item.id}
        className={`dropdown-item ${item.disabled ? 'disabled' : ''} ${item.className || ''}`.trim()}
        role="menuitem"
        data-item-id={item.id}
        onClick={() => !item.disabled && handleItemClick(item)}
        tabIndex={item.disabled ? -1 : 0}
        aria-label={item.ariaLabel}
        aria-disabled={item.disabled}
        title={item.title}
        data-testid={`${testId}-${item.id.toLowerCase()}`}
      >
        {renderSection(item.leftSection)}
        <span className="dropdown-label">{item.label}</span>
        {item.rightSection && (
          <div
            className="dropdown-right-section"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {renderSection(item.rightSection)}
          </div>
        )}
      </div>
    );
  };

  // Render label item
  const renderLabel = (item) => (
    <div key={item.id || `label-${item.label}`} className="label-item" role="presentation" data-testid={`${testId}-label-${item.label.toLowerCase().replace(/ /g, '-')}`}>
      {item.label}
    </div>
  );

  // Render divider item
  const renderDivider = (item, index) => (
    <div key={item.id || `divider-${index}`} className="dropdown-separator" role="separator" />
  );

  // Render menu content
  const renderMenuContent = () => {
    let dividerIndex = 0;

    return items.map((item) => {
      const itemType = item.type || 'item';

      if (itemType === 'label') {
        return renderLabel(item);
      }

      if (itemType === 'divider') {
        return renderDivider(item, dividerIndex++);
      }

      return renderMenuItem(item);
    });
  };

  // Clone children to attach click handler
  const triggerElement = React.isValidElement(children)
    ? React.cloneElement(children, {
        'onClick': (e) => {
          children.props.onClick?.(e);
          handleTriggerClick();
        },
        'data-testid': testId
      })
    : <div onClick={handleTriggerClick} data-testid={testId}>{children}</div>;

  return (
    <Dropdown
      onCreate={onDropdownCreate}
      icon={triggerElement}
      placement={placement}
      className={className}
      visible={isOpen}
      onClickOutside={handleClickOutside}
      {...dropdownProps}
    >
      <div role="menu" tabIndex={-1} onKeyDown={handleMenuKeyDown}>
        {renderMenuContent()}
      </div>
    </Dropdown>
  );
});

export default MenuDropdown;
