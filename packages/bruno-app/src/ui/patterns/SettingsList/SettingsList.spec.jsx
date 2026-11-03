import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import SettingsList from './index';

const theme = { border: { border0: '#efefef' } };

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('SettingsList', () => {
  it('renders its items in order', () => {
    renderWithTheme(
      <SettingsList>
        <div>First</div>
        <div>Second</div>
      </SettingsList>
    );
    const items = screen.getAllByText(/First|Second/);
    expect(items.map((el) => el.textContent)).toEqual(['First', 'Second']);
  });

  it('adds the dividers class only when asked', () => {
    const { container, rerender } = renderWithTheme(<SettingsList><div>A</div></SettingsList>);
    expect(container.firstChild).toHaveClass('settings-list');
    expect(container.firstChild).not.toHaveClass('settings-list--dividers');

    rerender(
      <ThemeProvider theme={theme}>
        <SettingsList dividers><div>A</div></SettingsList>
      </ThemeProvider>
    );
    expect(container.firstChild).toHaveClass('settings-list--dividers');
  });

  it('passes className and data-testid through', () => {
    renderWithTheme(<SettingsList className="page-list" data-testid="list"><div>A</div></SettingsList>);
    expect(screen.getByTestId('list')).toHaveClass('page-list');
  });
});
