import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import RadioButton from './index';
import themes from 'themes/index';

const renderWithTheme = (component) => {
  return render(<ThemeProvider theme={themes.dark}>{component}</ThemeProvider>);
};

describe('RadioButton', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      renderWithTheme(<RadioButton />);

      const radio = screen.getByRole('radio');
      expect(radio).toBeInTheDocument();
      expect(radio).not.toBeChecked();
      expect(radio).not.toBeDisabled();
    });

    it('should render with custom props', () => {
      renderWithTheme(<RadioButton id="test-radio" name="test-group" value="test-value" className="custom-class" />);

      const radio = screen.getByRole('radio');
      expect(radio).toHaveAttribute('id', 'test-radio');
      expect(radio).toHaveAttribute('name', 'test-group');
      expect(radio).toHaveAttribute('value', 'test-value');
    });

    it('should render as checked when checked prop is true', () => {
      renderWithTheme(<RadioButton checked={true} />);

      const radio = screen.getByRole('radio');
      expect(radio).toBeChecked();
    });

    it('should render as disabled when disabled prop is true', () => {
      renderWithTheme(<RadioButton disabled={true} />);

      const radio = screen.getByRole('radio');
      expect(radio).toBeDisabled();
    });

    it('should render with label element', () => {
      renderWithTheme(<RadioButton id="test-radio" />);

      const radio = screen.getByRole('radio');
      const label = radio.parentElement.querySelector('label');
      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute('for', 'test-radio');
    });
  });

  describe('User Interactions', () => {
    it('should call onChange when clicked and not disabled', () => {
      renderWithTheme(<RadioButton onChange={mockOnChange} />);

      const radio = screen.getByRole('radio');
      fireEvent.click(radio);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should not call onChange when clicked and disabled', () => {
      renderWithTheme(<RadioButton onChange={mockOnChange} disabled={true} />);

      const radio = screen.getByRole('radio');
      fireEvent.click(radio);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should call onChange when label is clicked', () => {
      renderWithTheme(<RadioButton id="test-radio" onChange={mockOnChange} />);

      const radio = screen.getByRole('radio');
      const label = radio.parentElement.querySelector('label');
      fireEvent.click(label);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should not call onChange when no onChange prop is provided', () => {
      renderWithTheme(<RadioButton />);

      const radio = screen.getByRole('radio');
      fireEvent.click(radio);

      // Should not throw error
      expect(radio).toBeInTheDocument();
    });

    it('should stay checked when clicked (radio button behavior)', () => {
      const TestWrapper = () => {
        const [checked, setChecked] = React.useState(false);

        return (
          <RadioButton
            checked={checked}
            onChange={() => setChecked(true)}
          />
        );
      };

      renderWithTheme(<TestWrapper />);

      const radio = screen.getByRole('radio');
      expect(radio).not.toBeChecked();

      fireEvent.click(radio);
      expect(radio).toBeChecked();

      // Radio buttons stay checked when clicked again
      fireEvent.click(radio);
      expect(radio).toBeChecked();
    });
  });

  describe('Radio Group Behavior', () => {
    it('should work correctly in a radio group', () => {
      const TestWrapper = () => {
        const [selectedValue, setSelectedValue] = React.useState('option1');

        return (
          <div>
            <RadioButton
              id="option1"
              name="test-group"
              value="option1"
              checked={selectedValue === 'option1'}
              onChange={() => setSelectedValue('option1')}
            />
            <RadioButton
              id="option2"
              name="test-group"
              value="option2"
              checked={selectedValue === 'option2'}
              onChange={() => setSelectedValue('option2')}
            />
          </div>
        );
      };

      renderWithTheme(<TestWrapper />);

      const radios = screen.getAllByRole('radio');
      const option1 = radios.find((radio) => radio.value === 'option1');
      const option2 = radios.find((radio) => radio.value === 'option2');

      expect(option1).toBeChecked();
      expect(option2).not.toBeChecked();

      fireEvent.click(option2);

      expect(option1).not.toBeChecked();
      expect(option2).toBeChecked();
    });

    it('should maintain radio group behavior with multiple options', () => {
      const TestWrapper = () => {
        const [selectedValue, setSelectedValue] = React.useState('option1');

        return (
          <div>
            <RadioButton
              id="option1"
              name="test-group"
              value="option1"
              checked={selectedValue === 'option1'}
              onChange={() => setSelectedValue('option1')}
            />
            <RadioButton
              id="option2"
              name="test-group"
              value="option2"
              checked={selectedValue === 'option2'}
              onChange={() => setSelectedValue('option2')}
            />
            <RadioButton
              id="option3"
              name="test-group"
              value="option3"
              checked={selectedValue === 'option3'}
              onChange={() => setSelectedValue('option3')}
            />
          </div>
        );
      };

      renderWithTheme(<TestWrapper />);

      const radios = screen.getAllByRole('radio');
      const option1 = radios.find((radio) => radio.value === 'option1');
      const option2 = radios.find((radio) => radio.value === 'option2');
      const option3 = radios.find((radio) => radio.value === 'option3');

      expect(option1).toBeChecked();
      expect(option2).not.toBeChecked();
      expect(option3).not.toBeChecked();

      fireEvent.click(option3);

      expect(option1).not.toBeChecked();
      expect(option2).not.toBeChecked();
      expect(option3).toBeChecked();
    });
  });

  describe('Accessibility', () => {
    it('should be focusable when not disabled', () => {
      renderWithTheme(<RadioButton />);

      const radio = screen.getByRole('radio');
      radio.focus();
      expect(radio).toHaveFocus();
    });

    it('should not be focusable when disabled', () => {
      renderWithTheme(<RadioButton disabled={true} />);

      const radio = screen.getByRole('radio');
      radio.focus();
      expect(radio).not.toHaveFocus();
    });

    it('should have proper ARIA attributes', () => {
      renderWithTheme(<RadioButton id="test-radio" name="test-group" value="test-value" />);

      const radio = screen.getByRole('radio');
      expect(radio).toHaveAttribute('id', 'test-radio');
      expect(radio).toHaveAttribute('name', 'test-group');
      expect(radio).toHaveAttribute('value', 'test-value');
    });

    it('should have associated label', () => {
      renderWithTheme(<RadioButton id="test-radio" />);

      const radio = screen.getByRole('radio');
      const label = radio.parentElement.querySelector('label');

      expect(label).toHaveAttribute('for', 'test-radio');
      expect(radio).toHaveAttribute('id', 'test-radio');
    });
  });

  describe('Styling', () => {
    it('should apply custom className to container', () => {
      renderWithTheme(<RadioButton className="custom-class" />);

      const container = screen.getByRole('radio').closest('.custom-class');
      expect(container).toBeInTheDocument();
    });

    it('should pass through additional props', () => {
      renderWithTheme(<RadioButton data-testid="custom-radio" aria-label="Custom radio button" />);

      const radio = screen.getByTestId('custom-radio');
      expect(radio).toBeInTheDocument();
      expect(radio).toHaveAttribute('aria-label', 'Custom radio button');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined checked prop', () => {
      renderWithTheme(<RadioButton checked={undefined} />);

      const radio = screen.getByRole('radio');
      expect(radio).not.toBeChecked();
    });

    it('should handle null checked prop', () => {
      renderWithTheme(<RadioButton checked={null} />);

      const radio = screen.getByRole('radio');
      expect(radio).not.toBeChecked();
    });

    it('should handle string checked prop', () => {
      renderWithTheme(<RadioButton checked="true" />);

      const radio = screen.getByRole('radio');
      expect(radio).toBeChecked();
    });

    it('should handle empty string className', () => {
      renderWithTheme(<RadioButton className="" />);

      const radio = screen.getByRole('radio');
      expect(radio).toBeInTheDocument();
    });

    it('should handle missing id prop', () => {
      renderWithTheme(<RadioButton />);

      const radio = screen.getByRole('radio');
      expect(radio).toBeInTheDocument();
      expect(radio).not.toHaveAttribute('id');
    });

    it('should handle missing name prop', () => {
      renderWithTheme(<RadioButton />);

      const radio = screen.getByRole('radio');
      expect(radio).toBeInTheDocument();
      expect(radio).not.toHaveAttribute('name');
    });

    it('should handle missing value prop', () => {
      renderWithTheme(<RadioButton />);

      const radio = screen.getByRole('radio');
      expect(radio).toBeInTheDocument();
      expect(radio).not.toHaveAttribute('value');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be focusable and respond to click after focus', () => {
      renderWithTheme(<RadioButton onChange={mockOnChange} />);

      const radio = screen.getByRole('radio');
      radio.focus();
      expect(radio).toHaveFocus();

      // Radio buttons don't trigger onChange on keyDown, but can be clicked after focus
      fireEvent.click(radio);
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should not be focusable when disabled', () => {
      renderWithTheme(<RadioButton onChange={mockOnChange} disabled={true} />);

      const radio = screen.getByRole('radio');
      radio.focus();

      expect(radio).not.toHaveFocus();
    });
  });
});
