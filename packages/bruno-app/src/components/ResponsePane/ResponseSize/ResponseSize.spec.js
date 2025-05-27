import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import ResponseSize from './index';

// Create minimal theme with only the properties needed for the component
const theme = {
  requestTabPanel: {
    responseStatus: '#666'
  }
};

// Wrap component with theme provider for styled-components
const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ResponseSize', () => {
  describe('Invalid or excluded size values', () => {
    it('should not render when size is undefined', () => {
      const { container } = renderWithTheme(<ResponseSize size={undefined} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('should not render when size is null', () => {
      const { container } = renderWithTheme(<ResponseSize size={null} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('should not render when size is NaN', () => {
      const { container } = renderWithTheme(<ResponseSize size={NaN} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('should not render when size is Infinity', () => {
      const { container } = renderWithTheme(<ResponseSize size={Infinity} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('should not render when size is -Infinity', () => {
      const { container } = renderWithTheme(<ResponseSize size={-Infinity} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('should not render when size is a string', () => {
      const { container } = renderWithTheme(<ResponseSize size="1024" />);
      expect(container).toBeEmptyDOMElement();
    });

    it('should not render when size is an object', () => {
      const { container } = renderWithTheme(<ResponseSize size={{value: 1024}} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Valid size values', () => {
    it('should handle zero bytes', () => {
      renderWithTheme(<ResponseSize size={0} />);
      const element = screen.getByText(/0B/);
      expect(element).toBeInTheDocument();
      expect(element.textContent).toMatch(/^0B$/);
      expect(element).toHaveAttribute('title', '0B');
    });

    it('should render bytes when size is less than 1024', () => {
      renderWithTheme(<ResponseSize size={500} />);
      const element = screen.getByText(/500B/);
      expect(element).toBeInTheDocument();
      expect(element.textContent).toMatch(/^500B$/);
      expect(element).toHaveAttribute('title', '500B');
    });

    it('should handle exactly 1024 bytes as size', () => {
      renderWithTheme(<ResponseSize size={1024} />);
      const element = screen.getByText(/1024B/);
      expect(element).toBeInTheDocument();
      expect(element.textContent).toMatch(/^1024B$/);
      expect(element).toHaveAttribute('title', '1,024B');
    });

    it('should render kilobytes when size is greater than 1024', () => {
      renderWithTheme(<ResponseSize size={1500} />);
      const element = screen.getByText(/1\.46KB/);
      expect(element).toBeInTheDocument();
      expect(element.textContent).toMatch(/^\d+\.\d+KB$/);
      expect(element).toHaveAttribute('title', '1,500B');
    });

    it('should handle large size numbers', () => {
      renderWithTheme(<ResponseSize size={10240} />);
      const element = screen.getByText(/10\.0KB/);
      expect(element).toBeInTheDocument();
      expect(element.textContent).toMatch(/^\d+\.\d+KB$/);
      expect(element).toHaveAttribute('title', '10,240B');
    });

    it('should handle decimal size numbers', () => {
      renderWithTheme(<ResponseSize size={1126.5} />);
      const element = screen.getByText(/1\.10KB/);
      expect(element).toBeInTheDocument();
      expect(element.textContent).toMatch(/^\d+\.\d+KB$/);
      expect(element).toHaveAttribute('title', '1,126.5B');
    });
  });
});