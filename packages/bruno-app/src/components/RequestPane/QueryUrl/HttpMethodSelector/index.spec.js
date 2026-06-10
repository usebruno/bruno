import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import HttpMethodSelector from './index';
import themes from 'themes/index';
import userEvent from '@testing-library/user-event';
import { ThemeContext } from 'providers/Theme';

const renderWithTheme = (component) => {
  return render(
    <ThemeContext.Provider value={{ theme: themes.dark }}>
      <ThemeProvider theme={themes.dark}>
        {component}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

const openMethodSelector = () => {
  fireEvent.click(screen.getByTestId('method-selector'));
};

describe('HttpMethodSelector', () => {
  const mockOnMethodSelect = jest.fn();

  beforeEach(() => {
    mockOnMethodSelect.mockClear();
  });

  describe('Initial Render', () => {
    it('should render with default GET method when no method prop is provided', () => {
      renderWithTheme(<HttpMethodSelector onMethodSelect={mockOnMethodSelect} />);

      const methodSpan = screen.getByText('GET');
      expect(methodSpan).toBeInTheDocument();
      expect(methodSpan).toHaveClass('method-span');
      expect(methodSpan).toHaveAttribute('title', 'GET');
    });

    it('should render with a standard method when method prop is provided', () => {
      renderWithTheme(<HttpMethodSelector method="POST" onMethodSelect={mockOnMethodSelect} />);

      const methodSpan = screen.getByText('POST');
      expect(methodSpan).toBeInTheDocument();
      expect(methodSpan).toHaveAttribute('title', 'POST');
    });

    it('should render with a custom method when method prop is provided', () => {
      renderWithTheme(<HttpMethodSelector method="CUSTOM" onMethodSelect={mockOnMethodSelect} />);

      const methodSpan = screen.getByText('CUSTOM');
      expect(methodSpan).toBeInTheDocument();
      expect(methodSpan).toHaveAttribute('title', 'CUSTOM');
    });
  });

  describe('Dropdown Interaction', () => {
    it('should display all standard HTTP methods in dropdown when clicked', async () => {
      renderWithTheme(<HttpMethodSelector onMethodSelect={mockOnMethodSelect} />);

      openMethodSelector();

      await waitFor(() => {
        const standardMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'TRACE', 'CONNECT'];
        const renderedMethods = standardMethods.map((method) => screen.getByTestId(`method-selector-${method.toLowerCase()}`).textContent.trim());

        standardMethods.forEach((method, index) => {
          // GET should have a checkmark (✓) since it's the default selected method
          const expectedText = index === 0 ? method + '✓' : method;
          expect(renderedMethods).toContain(expectedText);
        });
      });
    });

    it('should display "Add Custom" option in dropdown', async () => {
      renderWithTheme(<HttpMethodSelector onMethodSelect={mockOnMethodSelect} />);

      openMethodSelector();

      await waitFor(() => {
        const addCustom = screen.getByTestId('method-selector-add-custom');
        expect(addCustom).toBeInTheDocument();
        expect(addCustom).toHaveTextContent('+ Add Custom');
      });
    });

    it('should call onMethodSelect when a standard method is clicked', async () => {
      renderWithTheme(<HttpMethodSelector onMethodSelect={mockOnMethodSelect} />);

      openMethodSelector();

      await waitFor(() => {
        expect(screen.getByTestId('method-selector-post')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('method-selector-post'));

      expect(mockOnMethodSelect).toHaveBeenCalledWith('POST');
    });
  });

  describe('Custom Method Mode', () => {
    const getCustomMethodInput = () => document.querySelector('.method-selector.custom-input-mode input');

    it('should enter custom mode when "Add Custom" is clicked', async () => {
      renderWithTheme(<HttpMethodSelector onMethodSelect={mockOnMethodSelect} />);

      openMethodSelector();

      await waitFor(() => {
        fireEvent.click(screen.getByTestId('method-selector-add-custom'));
      });

      expect(mockOnMethodSelect).toHaveBeenCalledWith('');

      // Should show input field
      await waitFor(() => {
        const input = getCustomMethodInput();
        expect(input).toBeInTheDocument();
        expect(input).toHaveFocus();
      });
    });

    it('should call onMethodSelect with uppercase value when typing in custom input', async () => {
      const user = userEvent.setup();

      // Create a wrapper component that manages the method state
      const TestWrapper = () => {
        const [method, setMethod] = React.useState('GET');

        const handleMethodSelect = (newMethod) => {
          mockOnMethodSelect(newMethod);
          setMethod(newMethod);
        };

        return (
          <HttpMethodSelector
            method={method}
            onMethodSelect={handleMethodSelect}
          />
        );
      };

      renderWithTheme(<TestWrapper />);

      openMethodSelector();

      await waitFor(() => {
        fireEvent.click(screen.getByTestId('method-selector-add-custom'));
      });

      const input = getCustomMethodInput();
      await user.type(input, 'custom');

      expect(mockOnMethodSelect).toHaveBeenCalledWith('');
      expect(mockOnMethodSelect).toHaveBeenCalledWith('C');
      expect(mockOnMethodSelect).toHaveBeenCalledWith('CU');
      expect(mockOnMethodSelect).toHaveBeenCalledWith('CUS');
      expect(mockOnMethodSelect).toHaveBeenCalledWith('CUST');
      expect(mockOnMethodSelect).toHaveBeenCalledWith('CUSTO');
      expect(mockOnMethodSelect).toHaveBeenCalledWith('CUSTOM');
      expect(mockOnMethodSelect).toHaveBeenCalledTimes(7);
    });

    it('should exit custom mode and set method on Enter key', async () => {
      renderWithTheme(<HttpMethodSelector onMethodSelect={mockOnMethodSelect} />);

      openMethodSelector();

      await waitFor(() => {
        fireEvent.click(screen.getByTestId('method-selector-add-custom'));
      });

      const input = getCustomMethodInput();
      fireEvent.change(input, { target: { value: 'CUSTOM' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnMethodSelect).toHaveBeenCalledWith('CUSTOM');

      // Should exit custom mode
      await waitFor(() => {
        expect(getCustomMethodInput()).not.toBeInTheDocument();
      });
    });

    it('should set default method on Enter key with empty input', async () => {
      renderWithTheme(<HttpMethodSelector onMethodSelect={mockOnMethodSelect} />);

      openMethodSelector();

      await waitFor(() => {
        fireEvent.click(screen.getByTestId('method-selector-add-custom'));
      });

      const input = getCustomMethodInput();
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnMethodSelect).toHaveBeenCalledWith('GET');
    });

    it('should exit custom mode on Escape key and keep the custom method', async () => {
      renderWithTheme(<HttpMethodSelector method="POST" onMethodSelect={mockOnMethodSelect} />);

      openMethodSelector();

      await waitFor(() => {
        fireEvent.click(screen.getByTestId('method-selector-add-custom'));
      });

      const input = getCustomMethodInput();
      fireEvent.change(input, { target: { value: 'CUSTOM' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      // Should exit custom mode and onMethodSelect should be called with custom method
      await waitFor(() => {
        expect(getCustomMethodInput()).not.toBeInTheDocument();
        expect(mockOnMethodSelect).toHaveBeenCalledWith('CUSTOM');
      });
    });

    it('should exit custom mode on blur and keep the custom method', async () => {
      renderWithTheme(<HttpMethodSelector onMethodSelect={mockOnMethodSelect} />);

      openMethodSelector();

      await waitFor(() => {
        fireEvent.click(screen.getByTestId('method-selector-add-custom'));
      });

      const input = getCustomMethodInput();
      fireEvent.change(input, { target: { value: 'CUSTOM' } });
      fireEvent.blur(input);

      // Should exit custom mode and onMethodSelect should be called with custom method
      await waitFor(() => {
        expect(getCustomMethodInput()).not.toBeInTheDocument();
        expect(mockOnMethodSelect).toHaveBeenCalledWith('CUSTOM');
      });
    });
  });
});
