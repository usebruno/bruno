import '@testing-library/jest-dom';
import React, { forwardRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import Dropdown from './index';

// Minimal theme with the tokens Dropdown's StyledWrapper reads.
const theme = {
  font: { size: { sm: '0.75rem' } },
  border: { radius: { base: '3px' } },
  colors: { text: { danger: '#b91c1c', yellow: '#a16207' } },
  dropdown: {
    bg: '#ffffff',
    border: 'none',
    color: '#343434',
    hoverBg: '#f1f1f1',
    iconColor: '#8b8b8b',
    mutedText: '#9b9b9b',
    selectedColor: '#546de5',
    focusRing: '#546de5',
    separator: '#e5e5e5',
    shadow: '0 1px 3px rgba(0, 0, 0, 0.12)'
  }
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

// Tippy requires the trigger to forward a ref to a real DOM node.
const Trigger = forwardRef((props, ref) => (
  <button ref={ref} type="button" {...props}>
    Menu
  </button>
));

describe('Dropdown', () => {
  it('renders the trigger', () => {
    renderWithTheme(
      <Dropdown icon={<Trigger />}>
        <div>Item</div>
      </Dropdown>
    );

    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('shows the menu content when controlled visible is true', () => {
    renderWithTheme(
      <Dropdown icon={<Trigger />} visible>
        <div>Menu content</div>
      </Dropdown>
    );

    expect(screen.getByText('Menu content')).toBeInTheDocument();
  });

  it('does not show the menu content when visible is false', () => {
    renderWithTheme(
      <Dropdown icon={<Trigger />} visible={false}>
        <div>Menu content</div>
      </Dropdown>
    );

    expect(screen.queryByText('Menu content')).not.toBeInTheDocument();
  });

  it('opens on click when uncontrolled', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <Dropdown icon={<Trigger />}>
        <div>Menu content</div>
      </Dropdown>
    );

    expect(screen.queryByText('Menu content')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(await screen.findByText('Menu content')).toBeInTheDocument();
  });
});
