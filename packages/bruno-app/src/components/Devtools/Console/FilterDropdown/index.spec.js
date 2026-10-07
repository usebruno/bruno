import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'providers/Theme';
import { DevToolsFilterDropdown } from './index';

const renderFilterDropdown = (overrides = {}) => {
  const props = {
    filters: { error: true, warn: true, info: false },
    counts: { error: 2, warn: 1, info: 0 },
    onFilterToggle: jest.fn(),
    onToggleAll: jest.fn(),
    headerLabel: 'Filter by Type',
    title: 'Filter logs',
    ...overrides
  };

  render(
    <ThemeProvider>
      <DevToolsFilterDropdown {...props} />
    </ThemeProvider>
  );

  return props;
};

const openMenu = () => fireEvent.click(screen.getByTestId('filter-dropdown-trigger'));

describe('DevToolsFilterDropdown', () => {
  it('shows an active/total summary on the trigger when some filters are off', () => {
    renderFilterDropdown();
    expect(screen.getByTestId('filter-dropdown-trigger')).toHaveTextContent('2/3');
  });

  it('shows "All" on the trigger when every filter is enabled', () => {
    renderFilterDropdown({ filters: { error: true, warn: true } });
    expect(screen.getByTestId('filter-dropdown-trigger')).toHaveTextContent('All');
  });

  it('does not render the menu until the trigger is clicked', () => {
    renderFilterDropdown();
    expect(screen.queryByTestId('filter-dropdown-menu')).not.toBeInTheDocument();
  });

  it('opens the menu into a portal on document.body when the trigger is clicked', () => {
    renderFilterDropdown();
    openMenu();
    const menu = screen.getByTestId('filter-dropdown-menu');
    expect(menu.closest('[data-tippy-root]')?.parentElement).toBe(document.body);
  });

  it('lists one option per filter with its count', () => {
    renderFilterDropdown();
    openMenu();
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(screen.getByText('warn')).toBeInTheDocument();
    expect(screen.getByText('info')).toBeInTheDocument();
    expect(screen.getByText('(0)')).toBeInTheDocument();
  });

  it('calls onFilterToggle with the key and new checked state', () => {
    const props = renderFilterDropdown();
    openMenu();
    fireEvent.click(screen.getByText('info'));
    expect(props.onFilterToggle).toHaveBeenCalledWith('info', true);
  });

  it('labels the toggle-all button "Hide All" when every filter is on, and calls onToggleAll(false)', () => {
    const props = renderFilterDropdown({ filters: { error: true, warn: true } });
    openMenu();
    const toggleAll = screen.getByTestId('filter-toggle-all');
    expect(toggleAll).toHaveTextContent('Hide All');
    fireEvent.click(toggleAll);
    expect(props.onToggleAll).toHaveBeenCalledWith(false);
  });

  it('labels the toggle-all button "Show All" when at least one filter is off, and calls onToggleAll(true)', () => {
    const props = renderFilterDropdown();
    openMenu();
    const toggleAll = screen.getByTestId('filter-toggle-all');
    expect(toggleAll).toHaveTextContent('Show All');
    fireEvent.click(toggleAll);
    expect(props.onToggleAll).toHaveBeenCalledWith(true);
  });
});
