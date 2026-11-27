import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import TypeToConfirmDeleteModal from './index';

const renderModal = (props = {}) => {
  const onConfirm = props.onConfirm || jest.fn().mockResolvedValue(undefined);
  render(
    <ThemeProvider theme={themes.light}>
      <TypeToConfirmDeleteModal
        title="Delete Collection"
        name="Payments"
        pathname="/collections/payments"
        warning="This cannot be undone."
        onConfirm={onConfirm}
        onClose={jest.fn()}
        dataTestId="delete-collection-modal"
      />
    </ThemeProvider>
  );
  return { onConfirm };
};

const submitButton = () => screen.getByTestId('delete-collection-modal-submit-btn');
const confirmInput = () => screen.getByTestId('delete-collection-modal-confirm-input');

describe('TypeToConfirmDeleteModal', () => {
  it('keeps Delete disabled until the keyword is typed', () => {
    renderModal();
    expect(submitButton()).toBeDisabled();

    fireEvent.change(confirmInput(), { target: { value: 'delet' } });
    expect(submitButton()).toBeDisabled();

    fireEvent.change(confirmInput(), { target: { value: 'DELETE' } });
    expect(submitButton()).toBeEnabled();
  });

  it('runs onConfirm once the keyword is typed', async () => {
    const { onConfirm } = renderModal();

    fireEvent.change(confirmInput(), { target: { value: 'delete' } });
    fireEvent.click(submitButton());

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });
});
