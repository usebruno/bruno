import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import ResponseHeaders from './index';

const theme = {
  table: {
    border: '#ddd',
    striped: '#f5f5f5',
    thead: { color: '#333' }
  },
  font: { size: { sm: '12px' } }
};

describe('ResponseHeaders', () => {
  it('sorts header names alphabetically without changing their displayed names or values', () => {
    const headers = {
      'x-beta': 'beta',
      'X-charlie': 'charlie',
      'X-alpha': 'alpha'
    };

    render(
      <ThemeProvider theme={theme}>
        <ResponseHeaders headers={headers} item={{ uid: 'item-1' }} />
      </ThemeProvider>
    );

    const rows = screen.getAllByRole('row').slice(1);
    const displayedHeaders = rows.map((row) => {
      const cells = within(row).getAllByRole('cell');
      return { name: cells[0].textContent, value: cells[1].textContent };
    });

    expect(displayedHeaders).toEqual([
      { name: 'X-alpha', value: 'alpha' },
      { name: 'x-beta', value: 'beta' },
      { name: 'X-charlie', value: 'charlie' }
    ]);
    expect(Object.keys(headers)).toEqual(['x-beta', 'X-charlie', 'X-alpha']);
  });
});
