import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import Help from './index';

// Minimal theme with the tokens Help's StyledWrapper reads.
const theme = {
  text: '#343434',
  font: { size: { sm: '0.75rem' } },
  infoTip: { bg: '#ffffff', border: '1px solid #cccccc', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)' }
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
    expect(screen.queryByText('Helpful text')).not.toBeInTheDocument();
  });

  it('renders a custom icon component', () => {
    const CustomIcon = () => <span data-testid="custom-icon" />;
    renderWithTheme(<Help iconComponent={CustomIcon}>Helpful text</Help>);

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});
