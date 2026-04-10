import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import '@testing-library/jest-dom';
import BodyTabs from './index';

jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{ isOver: false }, jest.fn()]
}));

jest.mock('ui/MenuDropdown', () => {
  const React = require('react');
  return React.forwardRef(function MockMenuDropdown(props, ref) {
    React.useImperativeHandle(ref, () => ({ show: jest.fn(), hide: jest.fn() }));
    return null;
  });
});

const mockTheme = {
  bg: { secondary: '#f5f5f5' },
  border: '#ddd',
  tabs: { active: { color: '#007acc', border: '#007acc' } }
};

const renderWithTheme = (component) => {
  return render(<ThemeProvider theme={mockTheme}>{component}</ThemeProvider>);
};

describe('BodyTabs Component', () => {
  const mockTabs = [
    { id: 1, title: 'Tab 1' },
    { id: 2, title: 'Tab 2' },
    { id: 3, title: 'Tab 3' }
  ];

  const mockProps = {
    tabs: mockTabs,
    activeTabId: 1,
    onTabChange: jest.fn(),
    onAddTab: jest.fn(),
    onTabRename: jest.fn(),
    onTabClose: jest.fn(),
    onDuplicateTab: jest.fn(),
    onCloseOtherTabs: jest.fn(),
    children: <div data-testid="tab-content">Tab Content</div>
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all tabs', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Tab 3')).toBeInTheDocument();
    });

    it('should highlight active tab', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      const activeTab = screen.getByText('Tab 1').closest('[role="tab"]');
      expect(activeTab).toHaveClass('active');
    });

    it('should render add tab button', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      expect(screen.getByTitle('Add new body tab')).toBeInTheDocument();
    });

    it('should render tab content', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      expect(screen.getByTestId('tab-content')).toBeInTheDocument();
    });

    it('should show close buttons when multiple tabs exist', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      const closeButtons = screen.getAllByTitle('Close tab');
      expect(closeButtons).toHaveLength(3);
    });

    it('should hide close button when only one tab exists', () => {
      const singleTabProps = {
        ...mockProps,
        tabs: [{ id: 1, title: 'Only Tab' }]
      };

      renderWithTheme(<BodyTabs {...singleTabProps} />);

      const closeButton = screen.getByTitle('Close tab');
      expect(closeButton).not.toBeVisible();
    });
  });

  describe('Tab Interactions', () => {
    it('should call onTabChange when tab is clicked', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      fireEvent.click(screen.getByText('Tab 2'));

      expect(mockProps.onTabChange).toHaveBeenCalledWith(2);
    });

    it('should call onAddTab when add button is clicked', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      fireEvent.click(screen.getByTitle('Add new body tab'));

      expect(mockProps.onAddTab).toHaveBeenCalled();
    });

    it('should call onTabClose when close button is clicked', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      const closeButtons = screen.getAllByTitle('Close tab');
      fireEvent.click(closeButtons[0]);

      expect(mockProps.onTabClose).toHaveBeenCalledWith(1);
    });

    it('should prevent tab click when close button is clicked', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      const closeButtons = screen.getAllByTitle('Close tab');
      fireEvent.click(closeButtons[0]);

      expect(mockProps.onTabChange).not.toHaveBeenCalled();
    });
  });

  describe('Tab Renaming', () => {
    it('should show input field when tab is double-clicked', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      fireEvent.doubleClick(screen.getByText('Tab 1'));

      expect(screen.getByDisplayValue('Tab 1')).toBeInTheDocument();
    });

    it('should call onTabRename when Enter is pressed', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      fireEvent.doubleClick(screen.getByText('Tab 1'));
      const input = screen.getByDisplayValue('Tab 1');

      fireEvent.change(input, { target: { value: 'Renamed Tab' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockProps.onTabRename).toHaveBeenCalledWith(1, 'Renamed Tab');
    });

    it('should call onTabRename when input loses focus', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      fireEvent.doubleClick(screen.getByText('Tab 1'));
      const input = screen.getByDisplayValue('Tab 1');

      fireEvent.change(input, { target: { value: 'Blurred Tab' } });
      fireEvent.blur(input);

      expect(mockProps.onTabRename).toHaveBeenCalledWith(1, 'Blurred Tab');
    });

    it('should cancel renaming when Escape is pressed', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      fireEvent.doubleClick(screen.getByText('Tab 1'));
      const input = screen.getByDisplayValue('Tab 1');

      fireEvent.change(input, { target: { value: 'Changed Name' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(mockProps.onTabRename).not.toHaveBeenCalled();
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
    });

    it('should not call onTabRename with empty name', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      fireEvent.doubleClick(screen.getByText('Tab 1'));
      const input = screen.getByDisplayValue('Tab 1');

      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockProps.onTabRename).not.toHaveBeenCalled();
    });

    it('should auto-focus and select text when editing starts', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      fireEvent.doubleClick(screen.getByText('Tab 1'));
      const input = screen.getByDisplayValue('Tab 1');

      expect(input).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tabs array', () => {
      const emptyProps = {
        ...mockProps,
        tabs: []
      };

      renderWithTheme(<BodyTabs {...emptyProps} />);

      expect(screen.getByTitle('Add new body tab')).toBeInTheDocument();
      expect(screen.getByTestId('tab-content')).toBeInTheDocument();
    });

    it('should handle missing tab title', () => {
      const tabsWithMissingTitle = [
        { id: 1, title: 'Tab 1' },
        { id: 2 },
        { id: 3, title: 'Tab 3' }
      ];

      const propsWithMissingTitle = {
        ...mockProps,
        tabs: tabsWithMissingTitle
      };

      renderWithTheme(<BodyTabs {...propsWithMissingTitle} />);

      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 3')).toBeInTheDocument();
    });

    it('should handle invalid activeTabId', () => {
      const invalidActiveProps = {
        ...mockProps,
        activeTabId: 999
      };

      renderWithTheme(<BodyTabs {...invalidActiveProps} />);

      expect(screen.getByText('Tab 1')).toBeInTheDocument();
    });
  });

  describe('ARIA Attributes', () => {
    it('should have role="tablist" on the tabs container', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should have role="tab" on each tab', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
    });

    it('should have aria-selected=true only on the active tab', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
    });

    it('should have tabIndex=0 on active tab and tabIndex=-1 on others', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('tabindex', '0');
      expect(tabs[1]).toHaveAttribute('tabindex', '-1');
      expect(tabs[2]).toHaveAttribute('tabindex', '-1');
    });

    it('should have role="tabpanel" on the content area', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should move to next tab on ArrowRight', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });

      expect(mockProps.onTabChange).toHaveBeenCalledWith(2);
    });

    it('should wrap around to first tab on ArrowRight from last tab', () => {
      const props = { ...mockProps, activeTabId: 3 };
      renderWithTheme(<BodyTabs {...props} />);

      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });

      expect(mockProps.onTabChange).toHaveBeenCalledWith(1);
    });

    it('should move to previous tab on ArrowLeft', () => {
      const props = { ...mockProps, activeTabId: 2 };
      renderWithTheme(<BodyTabs {...props} />);

      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[1], { key: 'ArrowLeft' });

      expect(mockProps.onTabChange).toHaveBeenCalledWith(1);
    });

    it('should wrap around to last tab on ArrowLeft from first tab', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });

      expect(mockProps.onTabChange).toHaveBeenCalledWith(3);
    });

    it('should move to first tab on Home', () => {
      const props = { ...mockProps, activeTabId: 3 };
      renderWithTheme(<BodyTabs {...props} />);

      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[2], { key: 'Home' });

      expect(mockProps.onTabChange).toHaveBeenCalledWith(1);
    });

    it('should move to last tab on End', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[0], { key: 'End' });

      expect(mockProps.onTabChange).toHaveBeenCalledWith(3);
    });
  });
});
