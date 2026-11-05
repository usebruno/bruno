import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'providers/Theme';
import Modal from 'components/Modal';
import ImportOptionsMenu from './index';

const renderInModal = ({ handleConfirm = jest.fn(), onToggleFileFormat = jest.fn() } = {}) => render(
  <ThemeProvider>
    <Modal title="Import Collection" confirmText="Import" handleConfirm={handleConfirm} handleCancel={jest.fn()}>
      <input aria-label="Location" />
      <ImportOptionsMenu showFileFormat={false} onToggleFileFormat={onToggleFileFormat} />
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

  it('reaches Show file format with the arrow keys and toggles it with Enter without confirming the modal', async () => {
    const handleConfirm = jest.fn();
    const onToggleFileFormat = jest.fn();
    renderInModal({ handleConfirm, onToggleFileFormat });
    const options = screen.getByRole('button', { name: 'Options' });

    fireEvent.click(options);
    fireEvent.keyDown(await screen.findByRole('menu'), { key: 'ArrowDown' });
    const showFileFormat = screen.getByRole('menuitem', { name: 'Show file format' });
    expect(showFileFormat).toHaveFocus();

    pressEnter(showFileFormat);
    expect(onToggleFileFormat).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();
    expect(options).toHaveFocus();
  });

  it('closes on Escape and returns focus to the Options button', async () => {
    const onToggleFileFormat = jest.fn();
    renderInModal({ onToggleFileFormat });
    const options = screen.getByRole('button', { name: 'Options' });

    fireEvent.click(options);
    fireEvent.keyDown(await screen.findByRole('menu'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Show file format' }), { key: 'Escape' });

    expect(onToggleFileFormat).not.toHaveBeenCalled();
    expect(options).toHaveFocus();
  });
});
