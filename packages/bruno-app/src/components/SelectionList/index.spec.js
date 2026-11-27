import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import SelectionList from './index';

const renderList = (props = {}) =>
  render(
    <ThemeProvider theme={themes.light}>
      <SelectionList
        title="Collections"
        items={['a', 'b']}
        selectedItems={[]}
        onSelectAll={jest.fn()}
        onItemToggle={jest.fn()}
        getItemId={(item) => item}
        renderItemTitle={(item) => item}
        visibleRows={8}
        rowHeight={60}
        rowGap={4}
        {...props}
      />
    </ThemeProvider>
  );

const listStyle = () => getComputedStyle(screen.getByTestId('selection-list'));

describe('SelectionList height', () => {
  it('keeps the fixed list height by default', () => {
    renderList({ items: Array.from({ length: 20 }, (_, i) => `c${i}`) });

    expect(listStyle().maxHeight).toBe('508px');
  });

  it('fills the available height when fillHeight is set', () => {
    renderList({ fillHeight: true, items: Array.from({ length: 20 }, (_, i) => `c${i}`) });

    expect(listStyle().maxHeight).toBe('');
    expect(listStyle().minHeight).toBe('0');
    expect(listStyle().flex).toBe('1 1 auto');
  });
});
