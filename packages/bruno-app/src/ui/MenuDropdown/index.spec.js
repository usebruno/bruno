import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider } from 'providers/Theme';
import MenuDropdown from './index';

const ITEMS = [
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' }
];

// Popper cannot lay out in jsdom, so the positioning layer is replaced by one that exposes what the menu
// asks it to anchor to. It renders the menu inline, so events inside it still bubble to the owner.
let dropdownProps;
jest.mock('components/Dropdown', () => ({
  icon,
  visible,
  children,
  onContextMenu,
  ...props
}) => {
  dropdownProps = { visible, onContextMenu, ...props };
  return (
    <div onContextMenu={onContextMenu}>
      {icon}
      {visible && children}
    </div>
  );
});

// Mirrors a sidebar row: right-clicking the row re-opens the menu at the pointer.
const renderMenu = ({ onOwnerContextMenu = () => {}, ...menuProps } = {}) => {
  const menuRef = createRef();
  render(
    <ThemeProvider>
      <div
        data-testid="owner"
        onContextMenu={(event) => {
          event.preventDefault();
          onOwnerContextMenu(event);
          menuRef.current.show({ x: event.clientX, y: event.clientY });
        }}
      >
        <MenuDropdown ref={menuRef} items={ITEMS} placement="bottom-start" {...menuProps}>
          <button type="button">trigger</button>
        </MenuDropdown>
      </div>
    </ThemeProvider>
  );
  return menuRef;
};

describe('MenuDropdown position', () => {
  it('opens the menu at the point passed to show()', () => {
    const menuRef = renderMenu();

    act(() => menuRef.current.show({ x: 120, y: 80 }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(dropdownProps.getReferenceClientRect()).toEqual({
      width: 0,
      height: 0,
      top: 80,
      bottom: 80,
      left: 120,
      right: 120
    });
    expect(dropdownProps.offset).toEqual([0, 0]);
  });

  it('opens the menu at the point passed to toggle()', () => {
    const menuRef = renderMenu();

    act(() => menuRef.current.toggle({ x: 40, y: 30 }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(dropdownProps.getReferenceClientRect()).toMatchObject({ top: 30, bottom: 30, left: 40, right: 40 });
  });

  it('anchors the menu back to the trigger once it has been closed', () => {
    const menuRef = renderMenu();

    act(() => menuRef.current.show({ x: 120, y: 80 }));
    act(() => menuRef.current.hide());

    expect(dropdownProps.getReferenceClientRect).toBeNull();
    expect(dropdownProps.offset).toEqual([0, 10]);

    fireEvent.click(screen.getByText('trigger'));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(dropdownProps.getReferenceClientRect).toBeNull();
  });

  it('keeps the offset to the trigger passed by the caller', () => {
    const menuRef = renderMenu({ offset: [0, 4] });

    act(() => menuRef.current.show({ x: 120, y: 80 }));
    act(() => menuRef.current.hide());
    fireEvent.click(screen.getByText('trigger'));

    expect(dropdownProps.offset).toEqual([0, 4]);
  });

  it('goes back to the reference rect passed by the caller once it has been closed', () => {
    const tabLabelRect = { width: 40, height: 20, top: 6, bottom: 26, left: 100, right: 140 };
    const menuRef = renderMenu({ getReferenceClientRect: () => tabLabelRect });

    act(() => menuRef.current.show({ x: 120, y: 80 }));
    expect(dropdownProps.getReferenceClientRect()).toMatchObject({ top: 80, left: 120 });

    act(() => menuRef.current.hide());

    expect(dropdownProps.getReferenceClientRect()).toEqual(tabLabelRect);
  });

  it('keeps the menu where it opened when one of its items is right-clicked', () => {
    const onOwnerContextMenu = jest.fn();
    const menuRef = renderMenu({ onOwnerContextMenu });

    act(() => menuRef.current.show({ x: 120, y: 80 }));
    const defaultAllowed = fireEvent.contextMenu(screen.getByRole('menuitem', { name: 'Rename' }), {
      clientX: 300,
      clientY: 400
    });

    expect(defaultAllowed).toBe(false);
    expect(onOwnerContextMenu).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(dropdownProps.getReferenceClientRect()).toMatchObject({ top: 80, left: 120 });
  });
});
