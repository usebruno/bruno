import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import Checkbox from './index';
import themes from 'themes/index';

// Mock the IconCheckMark component
jest.mock('components/Icons/examples', () => ({
  IconCheckMark: ({ className, color, size }) => (
    <div
      data-testid="icon-checkmark"
      className={className}
      style={{ color, fontSize: size }}
    />
  )
}));

// Mock the useTheme hook
jest.mock('providers/Theme', () => ({
  useTheme: () => ({
    theme: {
      examples: {
        checkbox: {
          color: '#f59e0b'
        }
      }
    }
  })
}));

const renderWithTheme = (component) => {
  return render(<ThemeProvider theme={themes.dark}>{component}</ThemeProvider>);
};

describe('Checkbox', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      renderWithTheme(<Checkbox />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
      expect(checkbox).not.toBeDisabled();
    });

    it('should render with custom props', () => {
      renderWithTheme(<Checkbox id="test-checkbox" name="test-name" value="test-value" className="custom-class" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('id', 'test-checkbox');
      expect(checkbox).toHaveAttribute('name', 'test-name');
      expect(checkbox).toHaveAttribute('value', 'test-value');
    });

    it('should render as checked when checked prop is true', () => {
      renderWithTheme(<Checkbox checked={true} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should render as disabled when disabled prop is true', () => {
      renderWithTheme(<Checkbox disabled={true} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
    });

    it('should render checkmark icon', () => {
      renderWithTheme(<Checkbox />);

      const checkmark = screen.getByTestId('icon-checkmark');
      expect(checkmark).toBeInTheDocument();
      expect(checkmark).toHaveClass('checkbox-checkmark');
    });

    it('should show checkmark when checked', () => {
      renderWithTheme(<Checkbox checked={true} />);

      const checkmark = screen.getByTestId('icon-checkmark');
      expect(checkmark).toHaveStyle('visibility: visible');
    });

    it('should hide checkmark when not checked', () => {
      renderWithTheme(<Checkbox checked={false} />);

      const checkmark = screen.getByTestId('icon-checkmark');
      expect(checkmark).toHaveStyle('visibility: hidden');
    });
  });

  describe('User Interactions', () => {
    it('should call onChange when clicked and not disabled', () => {
      renderWithTheme(<Checkbox onChange={mockOnChange} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should not call onChange when clicked and disabled', () => {
      renderWithTheme(<Checkbox onChange={mockOnChange} disabled={true} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should not call onChange when no onChange prop is provided', () => {
      renderWithTheme(<Checkbox />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // Should not throw error
      expect(checkbox).toBeInTheDocument();
    });

    it('should toggle checked state when clicked', () => {
      const TestWrapper = () => {
        const [checked, setChecked] = React.useState(false);

        return (
          <Checkbox
            checked={checked}
            onChange={() => setChecked(!checked)}
          />
        );
      };

      renderWithTheme(<TestWrapper />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Accessibility', () => {
    it('should be focusable when not disabled', () => {
      renderWithTheme(<Checkbox />);

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();
      expect(checkbox).toHaveFocus();
    });

    it('should not be focusable when disabled', () => {
      renderWithTheme(<Checkbox disabled={true} />);

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();
      expect(checkbox).not.toHaveFocus();
    });

    it('should have proper ARIA attributes', () => {
      renderWithTheme(<Checkbox id="test-checkbox" name="test-name" value="test-value" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('id', 'test-checkbox');
      expect(checkbox).toHaveAttribute('name', 'test-name');
      expect(checkbox).toHaveAttribute('value', 'test-value');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      renderWithTheme(<Checkbox className="custom-class" />);

      const wrapper = screen.getByRole('checkbox').closest('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });

    it('should pass through additional props', () => {
      renderWithTheme(<Checkbox data-testid="custom-checkbox" aria-label="Custom checkbox" />);

      const checkbox = screen.getByTestId('custom-checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('aria-label', 'Custom checkbox');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined checked prop', () => {
      renderWithTheme(<Checkbox checked={undefined} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should handle null checked prop', () => {
      renderWithTheme(<Checkbox checked={null} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should handle string checked prop', () => {
      renderWithTheme(<Checkbox checked="true" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should handle empty string className', () => {
      renderWithTheme(<Checkbox className="" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });
  });
});
