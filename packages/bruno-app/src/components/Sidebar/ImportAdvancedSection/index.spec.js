import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'providers/Theme';
import Modal from 'components/Modal';
import ImportSettingDropdown from 'components/Sidebar/ImportSettingDropdown';
import ImportAdvancedSection from './index';

const renderInModal = (handleConfirm = jest.fn()) => render(
  <ThemeProvider>
    <Modal title="Import Collection" confirmText="Import" handleConfirm={handleConfirm} handleCancel={jest.fn()}>
      <input aria-label="Location" />
      <ImportAdvancedSection>
        <span>Advanced content</span>
      </ImportAdvancedSection>
    </Modal>
  </ThemeProvider>
);

const advancedToggle = () => screen.getByRole('button', { name: 'Advanced' });
const pressEnter = (element) => fireEvent.keyDown(element, { key: 'Enter', code: 'Enter', keyCode: 13 });

describe('ImportAdvancedSection', () => {
  it('starts collapsed and shows its content only while expanded', () => {
    renderInModal();

    expect(advancedToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Advanced content')).not.toBeVisible();

    fireEvent.click(advancedToggle());
    expect(advancedToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Advanced content')).toBeVisible();

    fireEvent.click(advancedToggle());
    expect(screen.getByText('Advanced content')).not.toBeVisible();
  });

  it('keeps its content in the layout while collapsed so opening it does not resize the modal', () => {
    renderInModal();
    fireEvent.click(advancedToggle());
    fireEvent.click(advancedToggle());

    expect(screen.getByText('Advanced content')).toBeInTheDocument();
    expect(screen.getByText('Advanced content')).not.toBeVisible();
  });

  it('closes a menu that is open inside it when it collapses', async () => {
    render(
      <ThemeProvider>
        <Modal title="Import Collection" confirmText="Import" handleConfirm={jest.fn()} handleCancel={jest.fn()}>
          <ImportAdvancedSection>
            <ImportSettingDropdown options={[{ value: 'tags', label: 'Tags' }, { value: 'path', label: 'Paths' }]} value="tags" onChange={jest.fn()} testId="grouping" />
          </ImportAdvancedSection>
        </Modal>
      </ThemeProvider>
    );
    fireEvent.click(advancedToggle());
    fireEvent.click(screen.getByTestId('grouping-dropdown'));
    expect(await screen.findByTestId('grouping-option-path')).toBeVisible();

    fireEvent.click(advancedToggle());

    expect(screen.queryByTestId('grouping-option-path')).not.toBeInTheDocument();
  });

  it('keeps Enter on its toggle from confirming the modal', () => {
    const handleConfirm = jest.fn();
    renderInModal(handleConfirm);

    pressEnter(advancedToggle());
    expect(handleConfirm).not.toHaveBeenCalled();

    pressEnter(screen.getByLabelText('Location'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
