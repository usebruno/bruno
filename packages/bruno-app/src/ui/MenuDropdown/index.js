import React, { forwardRef, useRef, useCallback, useState, useImperativeHandle, useEffect, useMemo } from 'react';
import Dropdown from 'components/Dropdown';
import SubMenuItem from './SubMenuItem';

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
 * @param {Array} props.items - Array of menu items. Supports multiple formats:
 *   Standard format (MenuDropdown items):
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
 *   - submenu: Array (optional, array of menu items for nested submenu, opens on hover)
 *
 *   Grouped format: [{name: string, options: [{id, label, ...}]}, ...]
 *   Flat format: [{id, label, ...}, ...]
 * @param {ReactNode} props.children - The trigger element (button, etc.)
 * @param {string} props.placement - Tippy placement (default: 'bottom-end')
 * @param {string} props.className - Optional className for the dropdown
 * @param {string} props.selectedItemId - Optional ID of the selected/active item to focus on open
 * @param {boolean} props.opened - Controlled open state (when provided, component is controlled)
 * @param {function} props.onChange - Callback when dropdown state changes: (opened: boolean) => void
 * @param {ReactNode} props.header - Optional header content to render above menu items
 * @param {ReactNode} props.footer - Optional footer content to render below menu items
 * @param {boolean} props.showTickMark - Optional flag to show checkmark (✓) on selected items (default: true)
 * @param {boolean} props.showGroupDividers - Optional flag to show dividers between groups in grouped format (default: true)
 * @param {string} props.groupStyle - Style for grouped items: 'action' (default, normal case) or 'select' (uppercase labels, indented items)
 * @param {boolean} props.autoFocusFirstOption - Optional flag to auto-focus first option when dropdown opens (default: false)
 * @param {string} props.submenuPlacement - Placement of submenus: 'right' (default) or 'left'. Controls both position and arrow direction.
 * @param {Object} props.dropdownProps - Other props passed to underlying Dropdown component
 * @param {React.Ref} ref - Optional ref to expose open/close methods
 */
const MenuDropdown = forwardRef(({
  items = [],
  children,
  placement = 'bottom-end',
  className,
  selectedItemId,
  opened,
  onChange,
  header,
  footer,
  showTickMark = true,
  showGroupDividers = true,
  groupStyle = 'action',
  autoFocusFirstOption = false,
  submenuPlacement = 'right',
  'data-testid': testId = 'menu-dropdown',
  ...dropdownProps
}, ref) => {
  const tippyRef = useRef();
  const selectedItemIdRef = useRef(selectedItemId);
  const autoFocusFirstOptionRef = useRef(autoFocusFirstOption);
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Keep refs in sync
  useEffect(() => {
    selectedItemIdRef.current = selectedItemId;
  }, [selectedItemId]);

  useEffect(() => {
    autoFocusFirstOptionRef.current = autoFocusFirstOption;
  }, [autoFocusFirstOption]);

  // Determine if component is controlled
  const isControlled = opened !== undefined;

  // Use controlled state if provided, otherwise use internal state
  const isOpen = isControlled ? opened : internalIsOpen;

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

  // Update state (respects controlled vs uncontrolled mode)
  const updateOpenState = useCallback((newState) => {
    if (isControlled) {
      onChange?.(newState);
    } else {
      setInternalIsOpen(newState);
    }
  }, [isControlled, onChange]);

  // Handle item click and close dropdown
  const handleItemClick = useCallback((item) => {
    if (item.disabled) return;
    item.onClick?.();
    updateOpenState(false);
  }, [updateOpenState]);

  // Convert legacy formats (grouped or flat) to standard MenuDropdown items format
  const normalizeItems = useCallback((itemsToNormalize) => {
    if (!Array.isArray(itemsToNormalize) || itemsToNormalize.length === 0) {
      return [];
    }

    // Check if it's a grouped format: [{options: [{value, label, ...}]}, ...]
    const firstItem = itemsToNormalize[0];
    const isGrouped = firstItem != null && typeof firstItem === 'object' && 'options' in firstItem;

    if (isGrouped) {
      const result = [];
      itemsToNormalize.forEach((group, groupIndex) => {
        // Add divider before each group except the first (if showGroupDividers is true)
        if (groupIndex > 0 && showGroupDividers) {
          result.push({ type: 'divider', id: `divider-${groupIndex}` });
        }

        // Add group name as label
        if (group.name) {
          const normalizeGroupNameForId = (group.name || '').toLowerCase().replace(/ /g, '-');
          result.push({ type: 'label', id: `label-${normalizeGroupNameForId}-${groupIndex}`, label: group.name, groupStyle });
        }

        // Convert group options to menu items
        group.options.forEach((option) => {
          result.push({
            id: option.id,
            label: option.label,
            type: 'item',
            onClick: option.onClick,
            disabled: option.disabled,
            className: option.className,
            leftSection: option.leftSection,
            rightSection: option.rightSection,
            ariaLabel: option.ariaLabel,
            title: option.title,
            groupStyle: groupStyle
          });
        });
      });
      return result;
    }

    // Already in standard format, return as-is
    return itemsToNormalize;
  }, [showGroupDividers, groupStyle]);

  // Normalize items to standard format
  const normalizedItems = useMemo(() => normalizeItems(items), [items, normalizeItems]);

  // Enhance items with tick mark for selected item if showTickMark is enabled
  const enhancedItems = useMemo(() => {
    if (!showTickMark || selectedItemId == null) {
      return normalizedItems;
    }

    return normalizedItems.map((item) => {
      // Skip non-item types (dividers, labels)
      if (item.type && item.type !== 'item') {
        return item;
      }

      const isSelected = item.id === selectedItemId;

      // Only add tick mark if item is selected and doesn't already have a rightSection
      if (isSelected && !item.rightSection) {
        return {
          ...item,
          rightSection: <span className="ml-auto">✓</span>
        };
      }

      return item;
    });
  }, [normalizedItems, showTickMark, selectedItemId]);

  // Clear focused class from all items
  const clearFocusedClass = (menuContainer) => {
    if (menuContainer) {
      menuContainer.querySelectorAll('.dropdown-item-focused').forEach((el) => {
        el.classList.remove('dropdown-item-focused');
      });
    }
  };

  // Focus a menu item
  const focusMenuItem = (item, addFocusedClass = true) => {
    if (item) {
      // Remove focused class from all items first
      const menuContainer = item.closest('[role="menu"]');
      clearFocusedClass(menuContainer);

      if (addFocusedClass) {
        item.classList.add('dropdown-item-focused');
      }
      item.focus();
      // scrollIntoView may not be available in test environments (jsdom)
      if (typeof item.scrollIntoView === 'function') {
        item.scrollIntoView({ block: 'nearest' });
      }
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
      updateOpenState(false);
      return;
    }

    // Handle action keys (Enter, Space)
    if (ACTION_KEYS.includes(e.key) && !isNoMenuItemFocused) {
      e.preventDefault();
      e.stopPropagation();
      const currentItem = itemsToNavigate[currentIndex];
      const itemId = currentItem?.getAttribute('data-item-id');
      // Use enhancedItems for finding the item
      const item = enhancedItems.find((i) => i.id === itemId);
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
      focusMenuItem(itemsToNavigate[nextIndex], true);
    }
  }, [getMenuItems, enhancedItems, handleItemClick, updateOpenState]);

  // Toggle dropdown visibility
  const handleTriggerClick = useCallback(() => {
    updateOpenState(!isOpen);
  }, [isOpen, updateOpenState]);

  // Close dropdown when clicking outside
  const handleClickOutside = useCallback((instance, event) => {
    // Don't close if clicking inside a submenu (another tippy popper)
    if (event?.target?.closest?.('[data-tippy-root]')) {
      return;
    }
    updateOpenState(false);
  }, [updateOpenState]);

  // Expose imperative methods via ref
  useImperativeHandle(ref, () => ({
    show: () => {
      updateOpenState(true);
    },
    hide: () => {
      updateOpenState(false);
    },
    toggle: () => {
      updateOpenState(!isOpen);
    }
  }), [updateOpenState, isOpen]);

  // Setup Tippy instance
  const onDropdownCreate = useCallback((ref) => {
    tippyRef.current = ref;
    if (ref) {
      ref.setProps({
        onShow: () => {
          // Focus selected item if available, otherwise focus menu container
          // Use requestAnimationFrame to ensure DOM is ready
          requestAnimationFrame(() => {
            const menuContainer = ref.popper?.querySelector('[role="menu"]');
            if (!menuContainer) return;

            const menuItems = Array.from(
              menuContainer.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')
            );

            // If selectedItemId is provided, find and focus that item
            // Use ref to get the latest value
            const currentSelectedItemId = selectedItemIdRef.current;
            if (currentSelectedItemId != null) {
              // Convert to string for comparison since data attributes are always strings
              const selectedItemIdStr = String(currentSelectedItemId);
              const selectedItem = menuItems.find(
                (item) => item.getAttribute('data-item-id') === selectedItemIdStr
              );

              if (selectedItem) {
                focusMenuItem(selectedItem, true);
                return;
              }
            }

            // If autoFocusFirstOption is true, focus the first item
            if (autoFocusFirstOptionRef.current && menuItems.length > 0) {
              focusMenuItem(menuItems[0], true);
              return;
            }

            // Fallback: focus menu container
            menuContainer.focus();
          });
        },
        onHide: () => {
          // Clear focused class when dropdown closes
          const menuContainer = ref.popper?.querySelector('[role="menu"]');
          clearFocusedClass(menuContainer);
        }
      });
    }
  }, []);

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

  // Get common props for menu items (shared between regular items and submenu triggers)
  const getMenuItemProps = (item, extraProps = {}) => {
    const selectIndentClass = item.groupStyle === 'select' ? 'dropdown-item-select' : '';
    const isActive = item.id === selectedItemId;
    const activeClass = isActive ? 'dropdown-item-active' : '';

    // Destructure className from extraProps to avoid it being overwritten by spread
    const { className: extraClassName, ...restExtraProps } = extraProps;

    return {
      'className': `dropdown-item ${item.disabled ? 'disabled' : ''} ${selectIndentClass} ${activeClass} ${extraClassName || ''} ${item.className || ''}`.trim(),
      'role': 'menuitem',
      'data-item-id': item.id,
      'tabIndex': item.disabled ? -1 : 0,
      'aria-label': item.ariaLabel,
      'aria-disabled': item.disabled,
      'aria-current': isActive ? 'true' : undefined,
      'title': item.title,
      'data-testid': `${testId}-${String(item.id).toLowerCase()}`,
      ...restExtraProps
    };
  };

  // Render the content inside a menu item (leftSection, label, and rightSection/arrow)
  const renderMenuItemContent = (item, rightContent = null) => (
    <>
      {renderSection(item.leftSection)}
      <span className="dropdown-label">{item.label}</span>
      {rightContent}
    </>
  );

  // Render menu item
  const renderMenuItem = (item) => {
    if (item.submenu) {
      return (
        <SubMenuItem
          key={item.id}
          item={item}
          onRootClose={() => updateOpenState(false)}
          submenuPlacement={submenuPlacement}
          getMenuItemProps={getMenuItemProps}
          renderMenuItemContent={renderMenuItemContent}
          MenuDropdownComponent={MenuDropdown}
        />
      );
    }

    const itemProps = getMenuItemProps(item);

    const rightContent = item.rightSection ? (
      <div
        className="dropdown-right-section"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {renderSection(item.rightSection)}
      </div>
    ) : null;

    return (
      <div
        key={item.id}
        {...itemProps}
        onClick={() => !item.disabled && handleItemClick(item)}
      >
        {renderMenuItemContent(item, rightContent)}
      </div>
    );
  };

  // Render label item
  const renderLabel = (item) => (
    <div
      key={item.id || `label-${item.label}`}
      className={`label-item ${item.groupStyle === 'select' ? 'label-select' : ''}`}
      role="presentation"
      data-testid={`${testId}-label-${(item.label || '').toLowerCase().replace(/ /g, '-')}`}
    >
      {item.groupStyle === 'select' ? (item.label || '').toUpperCase() : item.label || ''}
    </div>
  );

  // Render divider item
  const renderDivider = (item, index) => (
    <div key={item.id || `divider-${index}`} className="dropdown-separator" role="separator" />
  );

  // Render menu content
  const renderMenuContent = () => {
    let dividerIndex = 0;

    return enhancedItems.map((item) => {
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

  // Clone children to attach click handler and aria-expanded
  const triggerElement = React.isValidElement(children)
    ? React.cloneElement(children, {
        'onClick': (e) => {
          children.props.onClick?.(e);
          handleTriggerClick();
        },
        'aria-expanded': isOpen,
        'data-testid': testId
      })
    : <div onClick={handleTriggerClick} aria-expanded={isOpen} data-testid={testId}>{children}</div>;

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
      <div {...(testId && { 'data-testid': testId + '-dropdown' })}>
        {header && (
          <div className="dropdown-header-container" onClick={handleClickOutside}>
            {header}
            <div className="dropdown-divider"></div>
          </div>
        )}
        <div role="menu" tabIndex={-1} onKeyDown={handleMenuKeyDown}>
          {renderMenuContent()}
        </div>
        {footer && (
          <>
            <div className="dropdown-divider"></div>
            <div className="dropdown-footer-container">
              {footer}
            </div>
          </>
        )}
      </div>
    </Dropdown>
  );
});

export default MenuDropdown;
