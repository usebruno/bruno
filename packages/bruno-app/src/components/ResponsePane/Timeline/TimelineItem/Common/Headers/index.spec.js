import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import Headers from './index';

describe('Timeline Headers', () => {
  it('sorts array headers alphabetically without changing their displayed names or values', () => {
    const headers = [
      { name: 'x-beta', value: 'beta' },
      { name: 'X-charlie', value: 'charlie' },
      { name: 'X-alpha', value: 'alpha' }
    ];

    render(<Headers headers={headers} variant="request" />);

    const rows = screen.getAllByTestId('tl-header-row-request');
    const displayedHeaders = rows.map((row) => {
      const name = within(row).getByTestId('tl-header-name-request').textContent;
      const value = within(row).getByTestId('tl-header-value-request').textContent;
      return { name, value };
    });

    expect(displayedHeaders).toEqual([
      { name: 'X-alpha', value: 'alpha' },
      { name: 'x-beta', value: 'beta' },
      { name: 'X-charlie', value: 'charlie' }
    ]);
    expect(headers.map((header) => header.name)).toEqual(['x-beta', 'X-charlie', 'X-alpha']);
  });

  it('sorts object headers alphabetically', () => {
    render(
      <Headers
        headers={{
          'x-beta': 'beta',
          'X-charlie': 'charlie',
          'X-alpha': 'alpha'
        }}
        variant="response"
      />
    );

    const rows = screen.getAllByTestId('tl-header-row-response');
    const displayedNames = rows.map((row) => within(row).getByTestId('tl-header-name-response').textContent);

    expect(displayedNames).toEqual(['X-alpha', 'x-beta', 'X-charlie']);
  });
});
