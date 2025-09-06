import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import HttpMethodSelector from './index';
import themes from 'themes/index';
import userEvent from '@testing-library/user-event';

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={themes.dark}>
      {component}
    </ThemeProvider>
  );
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
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        const standardMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'TRACE', 'CONNECT'];
        const dropdownItems = screen.getAllByText((content, element) => {
          return element?.classList.contains('dropdown-item');
        });
        const renderedMethods = dropdownItems.map(item => item.textContent);
        
        standardMethods.forEach(method => {
          expect(renderedMethods).toContain(method);
        });
      });
    });

    it('should display "Add Custom" option in dropdown', async () => {
      renderWithTheme(<HttpMethodSelector onMethodSelect={mockOnMethodSelect} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        const addCustomSpan = screen.getByText('+ Add Custom');
        expect(addCustomSpan).toBeInTheDocument();
        expect(addCustomSpan).toHaveClass('text-link');
      });
    });

    it('should call onMethodSelect when a standard method is clicked', async () => {
      renderWithTheme(<HttpMethodSelector onMethodSelect={mockOnMethodSelect} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        const postMethod = screen.getByText('POST');
        fireEvent.click(postMethod);
      });
      
      expect(mockOnMethodSelect).toHaveBeenCalledWith('POST');
    });
  });

  describe('Custom Method Mode', () => {
    it('should enter custom mode when "Add Custom" is clicked', async () => {
      renderWithTheme(<HttpMethodSelector onMethodSelect={mockOnMethodSelect} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        const addCustom = screen.getByText('+ Add Custom');
        fireEvent.click(addCustom);
      });
      
      expect(mockOnMethodSelect).toHaveBeenCalledWith('');
      
      // Should show input field
      await waitFor(() => {
        const input = screen.getByRole('textbox');
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
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        const addCustom = screen.getByText('+ Add Custom');
        fireEvent.click(addCustom);
      });
      
      const input = await screen.findByRole('textbox');
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
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        const addCustom = screen.getByText('+ Add Custom');
        fireEvent.click(addCustom);
      });
      
      const input = await screen.findByRole('textbox');
      fireEvent.change(input, { target: { value: 'CUSTOM' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(mockOnMethodSelect).toHaveBeenCalledWith('CUSTOM');
      
      // Should exit custom mode
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      });
    });

    it('should set default method on Enter key with empty input', async () => {
      renderWithTheme(<HttpMethodSelector onMethodSelect={mockOnMethodSelect} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        const addCustom = screen.getByText('+ Add Custom');
        fireEvent.click(addCustom);
      });
      
      const input = await screen.findByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(mockOnMethodSelect).toHaveBeenCalledWith('GET');
    });

    it('should exit custom mode on Escape key and keep the custom method', async () => {
      renderWithTheme(<HttpMethodSelector method="POST" onMethodSelect={mockOnMethodSelect} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        const addCustom = screen.getByText('+ Add Custom');
        fireEvent.click(addCustom);
      });
      
      const input = await screen.findByRole('textbox');
      fireEvent.change(input, { target: { value: 'CUSTOM' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      
      // Should exit custom mode and onMethodSelect should be called with custom method
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(mockOnMethodSelect).toHaveBeenCalledWith('CUSTOM');
      });
    });

    it('should exit custom mode on blur and keep the custom method', async () => {
      renderWithTheme(<HttpMethodSelector onMethodSelect={mockOnMethodSelect} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        const addCustom = screen.getByText('+ Add Custom');
        fireEvent.click(addCustom);
      });
      
      const input = await screen.findByRole('textbox');
      fireEvent.change(input, { target: { value: 'CUSTOM' } });
      fireEvent.blur(input);
      
      // Should exit custom mode and onMethodSelect should be called with custom method
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(mockOnMethodSelect).toHaveBeenCalledWith('CUSTOM');
      });
    });
  });
});