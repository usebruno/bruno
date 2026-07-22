import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import Accordion from './index';

// Minimal theme with the tokens Accordion's styledWrapper reads.
const theme = {
  input: { border: '#cccccc' },
  plainGrid: { hoverBg: '#f1f1f1' }
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

// Content collapses via max-height (stays in the DOM), and the open header gets
// an `open` class — so open/closed state is asserted via that class.
const renderAccordion = (props = {}) =>
  renderWithTheme(
    <Accordion defaultIndex={0} {...props}>
      <Accordion.Item index={0}>
        <Accordion.Header>Section 1</Accordion.Header>
        <Accordion.Content>Content one</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item index={1}>
        <Accordion.Header>Section 2</Accordion.Header>
        <Accordion.Content>Content two</Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );

const header = (name) => screen.getByRole('button', { name: new RegExp(name) });

describe('Accordion', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders all headers and content', () => {
    renderAccordion();
    expect(header('Section 1')).toBeInTheDocument();
    expect(header('Section 2')).toBeInTheDocument();
    expect(screen.getByText('Content one')).toBeInTheDocument();
    expect(screen.getByText('Content two')).toBeInTheDocument();
  });

  it('opens the item given by defaultIndex', () => {
    renderAccordion({ defaultIndex: 0 });
    expect(header('Section 1')).toHaveClass('open');
    expect(header('Section 2')).not.toHaveClass('open');
  });

  it('opens a clicked item and closes the previously open one', async () => {
    renderAccordion({ defaultIndex: 0 });

    await user.click(header('Section 2'));

    expect(header('Section 2')).toHaveClass('open');
    expect(header('Section 1')).not.toHaveClass('open');
  });

  it('closes the open item when its header is clicked again', async () => {
    renderAccordion({ defaultIndex: 0 });

    await user.click(header('Section 1'));

    expect(header('Section 1')).not.toHaveClass('open');
  });

  it('renders all items closed when no defaultIndex is given', () => {
    renderAccordion({ defaultIndex: undefined });
    expect(header('Section 1')).not.toHaveClass('open');
    expect(header('Section 2')).not.toHaveClass('open');
  });
});
