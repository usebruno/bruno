import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'providers/Theme';
import Modal from 'components/Modal';
import ImportSettingDropdown from './index';

const options = [
  { value: 'tags', label: 'Tags' },
  { value: 'path', label: 'Paths' }
];

const renderInModal = ({ handleConfirm = jest.fn(), onChange = jest.fn() } = {}) => render(
  <ThemeProvider>
    <Modal title="Import Collection" confirmText="Import" handleConfirm={handleConfirm} handleCancel={jest.fn()}>
      <input aria-label="Location" />
      <ImportSettingDropdown options={options} value="tags" onChange={onChange} testId="grouping" />
    </Modal>
  </ThemeProvider>
);

const trigger = () => screen.getByTestId('grouping-dropdown');
const pressEnter = (element) => fireEvent.keyDown(element, { key: 'Enter', code: 'Enter', keyCode: 13 });

describe('ImportSettingDropdown', () => {
  it('renders the selected option on a button trigger', () => {
    renderInModal();

    expect(screen.getByRole('button', { name: 'Tags' })).toBe(trigger());
  });

  it('keeps Enter on its trigger from confirming the modal', () => {
    const handleConfirm = jest.fn();
    renderInModal({ handleConfirm });

    pressEnter(trigger());
    expect(handleConfirm).not.toHaveBeenCalled();

    pressEnter(screen.getByLabelText('Location'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('passes the picked option to onChange and returns focus to the trigger', async () => {
    const onChange = jest.fn();
    renderInModal({ onChange });

    fireEvent.click(trigger());
    fireEvent.click(await screen.findByTestId('grouping-option-path'));

    expect(onChange).toHaveBeenCalledWith('path');
    expect(trigger()).toHaveFocus();
  });

  it('closes the menu on Escape and returns focus to the trigger', async () => {
    renderInModal();

    fireEvent.click(trigger());
    const selectedItem = await screen.findByTestId('grouping-option-tags');
    await waitFor(() => expect(selectedItem).toHaveFocus());
    fireEvent.keyDown(selectedItem, { key: 'Escape', code: 'Escape', keyCode: 27 });

    await waitFor(() => expect(screen.queryByTestId('grouping-option-tags')).not.toBeInTheDocument());
    expect(trigger()).toHaveFocus();
  });
});
