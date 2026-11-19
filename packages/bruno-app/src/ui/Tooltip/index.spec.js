import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import Tooltip from './index';

const theme = {
  font: { size: { xs: '0.6875rem' } },
  border: { radius: { sm: '4px' }, border1: '#e5e5e5' },
  infoTip: { bg: '#ffffff', border: '#e5e5e5', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' },
  colors: { text: { muted: '#838383' } },
  text: '#343434'
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

  it('shows immediately with delayShow={0}', async () => {
    renderWithTheme(
      <Tooltip content="Invalid" delayShow={0} data-testid="anchor">
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

  it('hides for false content, shows the message, then hides again (cond && message)', async () => {
    const renderWith = (content) => (
      <ThemeProvider theme={theme}>
        <Tooltip content={content} isOpen anchorId="external" />
      </ThemeProvider>
    );
    const { rerender } = render(renderWith(false));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    rerender(renderWith('Timeout must be a number'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Timeout must be a number');

    rerender(renderWith(false));
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('shows numeric 0 as content', async () => {
    renderWithTheme(<Tooltip content={0} isOpen anchorId="external" />);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('0');
  });
});
