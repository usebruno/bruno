import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import Tooltip from './index';

const theme = {
  font: { size: { xs: '0.6875rem' } },
  border: { radius: { sm: '4px' } },
  shadow: { md: '0 2px 8px rgba(0, 0, 0, 0.14)' },
  status: { danger: { border: '#e5484d' }, warning: { border: '#f5a524' } },
  mode: 'light',
  text: '#343434',
  bg: '#ffffff'
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('Tooltip', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('shows content when the wrapped child is hovered', async () => {
    renderWithTheme(
      <Tooltip content="Save" data-testid="anchor">
        <button type="button">Save</button>
      </Tooltip>
    );

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await user.hover(screen.getByTestId('anchor'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Save');
  });

  it('renders the shortcut after the content', async () => {
    renderWithTheme(
      <Tooltip content="Save" shortcut="Cmd + S" data-testid="anchor">
        <button type="button">Save</button>
      </Tooltip>
    );

    await user.hover(screen.getByTestId('anchor'));
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.querySelector('kbd')).toHaveTextContent('Cmd + S');
  });

  it('mounts the tooltip on document.body so ancestors cannot clip or restack it', async () => {
    const { container } = renderWithTheme(
      <div style={{ overflow: 'hidden' }}>
        <Tooltip content="Clipped?" isOpen anchorId="external" />
        <span id="external">anchor</span>
      </div>
    );

    const tooltip = await screen.findByRole('tooltip');
    expect(container.contains(tooltip)).toBe(false);
    expect(document.body.contains(tooltip)).toBe(true);
  });

  it('reads content from data-tooltip-content when anchored by id', async () => {
    renderWithTheme(
      <>
        <span data-tooltip-id="shared" data-tooltip-content="From attribute" data-testid="anchor">anchor</span>
        <Tooltip id="shared" />
      </>
    );

    await user.hover(screen.getByTestId('anchor'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('From attribute');
  });

  it('renders nothing for empty content', async () => {
    renderWithTheme(<Tooltip content="" isOpen anchorId="external" />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('applies tooltipTestId to the body', async () => {
    renderWithTheme(<Tooltip content="Body" isOpen anchorId="external" tooltipTestId="tooltip-body" />);
    expect(await screen.findByTestId('tooltip-body')).toHaveTextContent('Body');
  });

  it('shows an arrow by default and hides it with arrow={false}', async () => {
    // react-tooltip keeps the arrow node and hides it with its noArrow class.
    const arrowOf = (tooltip) => tooltip.querySelector('.react-tooltip-arrow');
    const { rerender } = renderWithTheme(<Tooltip content="Body" isOpen anchorId="external" />);
    expect(arrowOf(await screen.findByRole('tooltip')).className).not.toMatch(/noArrow/);

    rerender(<ThemeProvider theme={theme}><Tooltip content="Body" isOpen anchorId="external" arrow={false} /></ThemeProvider>);
    expect(arrowOf(screen.getByRole('tooltip')).className).toMatch(/noArrow/);
  });

  it('renders no anchor wrapper for boolean children', () => {
    const { container } = renderWithTheme(<Tooltip content="Body">{false}</Tooltip>);
    expect(container.querySelector('span')).not.toBeInTheDocument();
  });

  it('shows error tooltips without the hover delay', async () => {
    renderWithTheme(
      <Tooltip variant="error" content="Invalid" data-testid="anchor">
        <span>field</span>
      </Tooltip>
    );

    await user.hover(screen.getByTestId('anchor'));
    expect(await screen.findByRole('tooltip', {}, { timeout: 150 })).toHaveTextContent('Invalid');
  });

  it('prefers each anchor\'s data-tooltip-content over the shared content', async () => {
    renderWithTheme(
      <>
        <span data-tooltip-id="shared" data-tooltip-content="From anchor" data-testid="anchor">anchor</span>
        <Tooltip id="shared" content="Fallback" />
      </>
    );

    await user.hover(screen.getByTestId('anchor'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('From anchor');
  });
});
