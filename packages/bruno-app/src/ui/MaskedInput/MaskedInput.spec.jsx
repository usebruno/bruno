import '@testing-library/jest-dom';
import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import MaskedInput from './index';

const theme = {
  mode: 'light',
  text: '#343434',
  input: {
    bg: '#ffffff',
    border: '#cccccc',
    focusBorder: '#343434',
    placeholder: { color: '#b0b0b0', opacity: 0.8 }
  },
  background: { mantle: '#f8f8f8', surface0: '#f1f1f1' },
  status: { danger: { border: '#ce4f3b', text: '#ce4f3b' } },
  colors: { text: { muted: '#9b9b9b' } },
  codemirror: { placeholder: { color: '#b0b0b0', opacity: 0.75 } },
  border: { radius: { sm: '4px', base: '6px' } },
  font: { size: { xs: '0.6875rem', sm: '0.75rem', base: '0.8125rem' } }
};

const renderMasked = (props = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <MaskedInput value="hunter2" onChange={() => {}} {...props} />
    </ThemeProvider>
  );

describe('MaskedInput', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('is masked by default and reveals and re-hides the value', async () => {
    renderMasked();
    const input = screen.getByTestId('masked-input');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show value' }));
    expect(input).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Hide value' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('is reachable and operable by keyboard', async () => {
    renderMasked();
    await user.tab();
    expect(screen.getByTestId('masked-input')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Show value' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('masked-input')).toHaveAttribute('type', 'text');
  });

  it('can be controlled with visible and onVisibilityChange', async () => {
    const onVisibilityChange = jest.fn();
    const { rerender } = renderMasked({ visible: false, onVisibilityChange });

    await user.click(screen.getByRole('button', { name: 'Show value' }));
    expect(onVisibilityChange).toHaveBeenCalledWith(true);
    // Controlled: it does not flip until the parent says so.
    expect(screen.getByTestId('masked-input')).toHaveAttribute('type', 'password');

    rerender(
      <ThemeProvider theme={theme}>
        <MaskedInput value="hunter2" onChange={() => {}} visible onVisibilityChange={onVisibilityChange} />
      </ThemeProvider>
    );
    expect(screen.getByTestId('masked-input')).toHaveAttribute('type', 'text');
  });

  it('hides the reveal button when disabled', () => {
    renderMasked({ disabled: true });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('masked-input')).toBeDisabled();
  });

  it('turns off autofill, autocorrect and autocapitalize unless the caller overrides them', () => {
    const { unmount } = renderMasked();
    const input = screen.getByTestId('masked-input');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('autocorrect', 'off');
    expect(input).toHaveAttribute('autocapitalize', 'off');
    unmount();

    renderMasked({ autoComplete: 'new-password' });
    expect(screen.getByTestId('masked-input')).toHaveAttribute('autocomplete', 'new-password');
  });

  it('takes the Input props: label, error, id, name, ref and data-testid', () => {
    const ref = createRef();
    renderMasked({ label: 'Token', error: 'Token is required', id: 'token', name: 'auth.token', ref, ...{ 'data-testid': 'token-input' } });

    const input = screen.getByTestId('token-input');
    expect(screen.getByLabelText('Token')).toBe(input);
    expect(input).toHaveAttribute('name', 'auth.token');
    expect(ref.current).toBe(input);
    expect(screen.getByRole('alert')).toHaveTextContent('Token is required');
    expect(screen.getByTestId('token-input-visibility-toggle')).toBeInTheDocument();
  });

  it('ignores a type prop, since masking owns it', () => {
    renderMasked({ type: 'text' });
    expect(screen.getByTestId('masked-input')).toHaveAttribute('type', 'password');
  });

  it('renders rightSection after the reveal button', () => {
    renderMasked({ rightSection: <span data-testid="suffix">x</span> });
    const toggle = screen.getByRole('button', { name: 'Show value' });
    const suffix = screen.getByTestId('suffix');
    expect(toggle.compareDocumentPosition(suffix) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
