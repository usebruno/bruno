import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import Help from './index';

// Minimal theme with the tokens ui/Tooltip reads.
const theme = {
  font: { size: { xs: '0.6875rem' } },
  border: { radius: { sm: '4px' } },
  shadow: { md: '0 2px 8px rgba(0, 0, 0, 0.14)' },
  mode: 'light',
  text: '#343434',
  bg: '#ffffff'
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('Help', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders the trigger icon and hides the tooltip initially', () => {
    const { container } = renderWithTheme(<Help>Helpful text</Help>);

    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByText('Helpful text')).not.toBeInTheDocument();
  });

  it('shows the tooltip content on hover', async () => {
    const { container } = renderWithTheme(<Help>Helpful text</Help>);

    await user.hover(container.querySelector('span'));
    expect(await screen.findByText('Helpful text')).toBeInTheDocument();
  });

  it('hides the tooltip on unhover', async () => {
    const { container } = renderWithTheme(<Help>Helpful text</Help>);
    const trigger = container.querySelector('span');

    await user.hover(trigger);
    expect(await screen.findByText('Helpful text')).toBeInTheDocument();

    await user.unhover(trigger);
    await waitFor(() => expect(screen.queryByText('Helpful text')).not.toBeInTheDocument());
  });

  it('renders a custom icon component', () => {
    const CustomIcon = () => <span data-testid="custom-icon" />;
    renderWithTheme(<Help iconComponent={CustomIcon}>Helpful text</Help>);

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});
