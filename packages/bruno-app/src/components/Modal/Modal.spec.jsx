import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import Modal from './index';

// Theme covering the tokens Modal's StyledWrapper and the footer ui/Button read.
const theme = {
  text: '#343434',
  textLink: '#546de5',
  primary: { solid: '#546de5' },
  font: { size: { xs: '0.6875rem', sm: '0.75rem', base: '0.8125rem', md: '0.875rem' } },
  border: {
    radius: { sm: '2px', base: '3px', md: '4px', lg: '6px' },
    border0: '#efefef',
    border2: '#cccccc'
  },
  input: { bg: '#ffffff', border: '#cccccc', focusBorder: '#8b8b8b' },
  modal: {
    title: { color: '#343434', bg: '#f8f8f8' },
    body: { bg: '#ffffff', color: '#343434' },
    backdrop: { opacity: 0.5 }
  },
  button2: {
    color: {
      primary: { bg: '#546de5', text: '#ffffff', border: '#546de5' },
      secondary: { bg: '#f1f1f1', text: '#343434', border: '#cccccc' }
    }
  }
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

// Close fires after a fade timeout; use 0 so it resolves on the next tick.
const baseProps = {
  title: 'Example Modal',
  dataTestId: 'example-modal',
  closeModalFadeTimeout: 0
};

describe('Modal', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders the title and content as a dialog', () => {
    renderWithTheme(
      <Modal {...baseProps} handleCancel={() => {}} handleConfirm={() => {}}>
        <p>Body content</p>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Example Modal')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('calls handleConfirm when the confirm button is clicked', async () => {
    const handleConfirm = jest.fn();
    renderWithTheme(
      <Modal {...baseProps} handleCancel={() => {}} handleConfirm={handleConfirm}>
        <p>Body</p>
      </Modal>
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls handleCancel when the cancel button is clicked', async () => {
    const handleCancel = jest.fn();
    renderWithTheme(
      <Modal {...baseProps} handleCancel={handleCancel} handleConfirm={() => {}}>
        <p>Body</p>
      </Modal>
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(handleCancel).toHaveBeenCalledTimes(1));
  });

  it('calls handleCancel when the close (X) button is clicked', async () => {
    const handleCancel = jest.fn();
    renderWithTheme(
      <Modal {...baseProps} handleCancel={handleCancel} handleConfirm={() => {}}>
        <p>Body</p>
      </Modal>
    );

    await user.click(screen.getByTestId('modal-close-button'));
    await waitFor(() => expect(handleCancel).toHaveBeenCalledTimes(1));
  });

  it('closes on Escape', async () => {
    const handleCancel = jest.fn();
    renderWithTheme(
      <Modal {...baseProps} handleCancel={handleCancel} handleConfirm={() => {}}>
        <p>Body</p>
      </Modal>
    );

    // The handler checks the legacy `event.keyCode`, which jsdom doesn't set from
    // userEvent's keyboard map — dispatch it explicitly via fireEvent.
    fireEvent.keyDown(document, { key: 'Escape', keyCode: 27 });
    await waitFor(() => expect(handleCancel).toHaveBeenCalledTimes(1));
  });

  it('disables the confirm button when confirmDisabled is set', () => {
    renderWithTheme(
      <Modal {...baseProps} confirmDisabled handleCancel={() => {}} handleConfirm={() => {}}>
        <p>Body</p>
      </Modal>
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('hides the footer buttons when hideFooter is set', () => {
    renderWithTheme(
      <Modal {...baseProps} hideFooter handleCancel={() => {}} handleConfirm={() => {}}>
        <p>Body</p>
      </Modal>
    );

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});
