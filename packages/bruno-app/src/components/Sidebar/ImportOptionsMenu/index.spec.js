import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'providers/Theme';
import Modal from 'components/Modal';
import ImportOptionsMenu from './index';

const renderInModal = ({ handleConfirm = jest.fn() } = {}) => render(
  <ThemeProvider>
    <Modal title="Import Collection" confirmText="Import" handleConfirm={handleConfirm} handleCancel={jest.fn()}>
      <input aria-label="Location" />
      <ImportOptionsMenu showFileFormat={false} onToggleFileFormat={jest.fn()} />
    </Modal>
  </ThemeProvider>
);

const pressEnter = (element) => fireEvent.keyDown(element, { key: 'Enter', code: 'Enter', keyCode: 13 });

describe('ImportOptionsMenu', () => {
  it('keeps Enter on the Options button from confirming the modal', () => {
    const handleConfirm = jest.fn();
    renderInModal({ handleConfirm });

    pressEnter(screen.getByRole('button', { name: 'Options' }));
    expect(handleConfirm).not.toHaveBeenCalled();

    pressEnter(screen.getByLabelText('Location'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
