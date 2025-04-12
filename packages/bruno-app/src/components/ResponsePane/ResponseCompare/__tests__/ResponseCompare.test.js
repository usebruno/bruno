import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import ResponseCompare from '../index';
import { ThemeProvider } from 'styled-components';
import { theme } from 'theme';

const mockItem = {
  uid: 'test-uid',
  response: {
    data: { test: 'current' }
  }
};

const mockCollection = {
  timeline: [
    {
      itemUid: 'test-uid',
      timestamp: Date.now(),
      response: {
        data: { test: 'previous' }
      }
    }
  ]
};

describe('ResponseCompare', () => {
  const renderComponent = () =>
    render(
      <ThemeProvider theme={theme}>
        <ResponseCompare item={mockItem} collection={mockCollection} />
      </ThemeProvider>
    );

  it('should render without crashing', () => {
    renderComponent();
    expect(screen.getByText('Select a previous response...')).toBeInTheDocument();
  });

  it('should switch between split and unified views', () => {
    renderComponent();
    
    // Should start with split view
    expect(screen.getByText('Current Response')).toBeInTheDocument();
    
    // Switch to unified view
    fireEvent.click(screen.getByText('Unified'));
    expect(screen.queryByText('Current Response')).not.toBeInTheDocument();
  });

  it('should show previous response when selected', () => {
    renderComponent();
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, {
      target: { value: JSON.stringify(mockCollection.timeline[0]) }
    });
    
    expect(screen.getByText(/"test": "previous"/)).toBeInTheDocument();
  });
}); 