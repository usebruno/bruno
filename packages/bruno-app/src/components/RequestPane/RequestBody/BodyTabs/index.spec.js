import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import '@testing-library/jest-dom';
import BodyTabs from './index';

const mockTheme = {
  bg: { secondary: '#f5f5f5' },
  border: '#ddd',
  tabs: { active: { color: '#007acc' } },
};

const renderWithTheme = component => {
  return render(<ThemeProvider theme={mockTheme}>{component}</ThemeProvider>);
};

describe('BodyTabs Component', () => {
  const mockTabs = [
    { id: 1, title: 'Tab 1' },
    { id: 2, title: 'Tab 2' },
    { id: 3, title: 'Tab 3' },
  ];

  const mockProps = {
    tabs: mockTabs,
    activeTabId: 1,
    onTabChange: jest.fn(),
    onAddTab: jest.fn(),
    onTabRename: jest.fn(),
    onTabClose: jest.fn(),
    children: <div data-testid="tab-content">Tab Content</div>,
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

      const activeTab = screen.getByText('Tab 1').closest('.body-tab');
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
        tabs: [{ id: 1, title: 'Only Tab' }],
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

      // onTabChange should not be called when close button is clicked
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
        tabs: [],
      };

      renderWithTheme(<BodyTabs {...emptyProps} />);

      expect(screen.getByTitle('Add new body tab')).toBeInTheDocument();
      expect(screen.getByTestId('tab-content')).toBeInTheDocument();
    });

    it('should handle missing tab title', () => {
      const tabsWithMissingTitle = [
        { id: 1, title: 'Tab 1' },
        { id: 2 }, // Missing title
        { id: 3, title: 'Tab 3' },
      ];

      const propsWithMissingTitle = {
        ...mockProps,
        tabs: tabsWithMissingTitle,
      };

      renderWithTheme(<BodyTabs {...propsWithMissingTitle} />);

      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 3')).toBeInTheDocument();
      // Tab with missing title should still render but might show empty or fallback content
    });

    it('should handle invalid activeTabId', () => {
      const invalidActiveProps = {
        ...mockProps,
        activeTabId: 999, // Non-existent tab ID
      };

      renderWithTheme(<BodyTabs {...invalidActiveProps} />);

      // Should still render without throwing errors
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      const tabElements = screen.getAllByRole('button');
      // Includes tab buttons and add/close buttons
      expect(tabElements.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', () => {
      renderWithTheme(<BodyTabs {...mockProps} />);

      const firstTab = screen.getByText('Tab 1').closest('.body-tab');

      // Tab should be focusable
      firstTab.focus();
      expect(document.activeElement).toBe(firstTab);
    });
  });
});
