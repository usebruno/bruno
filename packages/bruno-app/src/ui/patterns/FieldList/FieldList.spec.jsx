import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import FieldList from './index';

const theme = { border: { border0: '#efefef' } };

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('FieldList', () => {
  it('renders its items in order', () => {
    renderWithTheme(
      <FieldList>
        <div>First</div>
        <div>Second</div>
      </FieldList>
    );
    const items = screen.getAllByText(/First|Second/);
    expect(items.map((el) => el.textContent)).toEqual(['First', 'Second']);
  });

  it('adds the dividers class only when asked', () => {
    const { container, rerender } = renderWithTheme(<FieldList><div>A</div></FieldList>);
    expect(container.firstChild).toHaveClass('field-list');
    expect(container.firstChild).not.toHaveClass('field-list--dividers');

    rerender(
      <ThemeProvider theme={theme}>
        <FieldList dividers><div>A</div></FieldList>
      </ThemeProvider>
    );
    expect(container.firstChild).toHaveClass('field-list--dividers');
  });

  it('passes className through', () => {
    const { container } = renderWithTheme(<FieldList className="page-list"><div>A</div></FieldList>);
    expect(container.firstChild).toHaveClass('page-list');
  });
});
