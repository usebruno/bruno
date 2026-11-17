jest.mock('platform', () => ({
  os: {
    family: 'Windows'
  }
}));

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithWorkspaceSpecs, workspaceSpec, pickWorkspaceSpec } from 'components/OpenAPISyncTab/testUtils';
import ConnectionSettingsModal from './index';

const petsSpec = workspaceSpec('pets', 'Pets', 'C:\\WS\\Specs\\Pets.yaml');
const zooSpec = workspaceSpec('zoo', 'Zoo', 'C:\\WS\\Specs\\Zoo.yaml');

const renderModal = (sourceUrl) => {
  const onSave = jest.fn().mockResolvedValue();
  const utils = renderWithWorkspaceSpecs(
    <ConnectionSettingsModal
      collection={{
        pathname: 'C:\\ws\\collections\\pets-api',
        brunoConfig: { openapi: [{ sourceUrl, autoCheck: true, autoCheckInterval: 5 }] }
      }}
      sourceUrl={sourceUrl}
      onSave={onSave}
      onDisconnect={jest.fn()}
      onClose={jest.fn()}
    />,
    [petsSpec, zooSpec]
  );
  return { ...utils, onSave };
};

describe('ConnectionSettingsModal on Windows, where file paths ignore case', () => {
  it('opens on the Workspace tab when a relative POSIX source points at a spec spelled with different capitals', () => {
    const { getByTestId } = renderModal('../../specs/pets.yaml');

    expect(getByTestId('tab-workspace')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('spec-source-workspace-select')).toHaveTextContent('Pets');
  });

  it('saves the loaded spec path when switching to another workspace spec', async () => {
    const { getByRole, getByTestId, onSave } = renderModal('../../specs/pets.yaml');

    pickWorkspaceSpec(getByTestId, 'zoo');
    fireEvent.click(getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ sourceUrl: 'C:\\WS\\Specs\\Zoo.yaml' })
    ));
  });

  it('opens on the File tab for a source outside the workspace and keeps its Windows path on save', async () => {
    const { getByRole, getByTestId, onSave } = renderModal('..\\..\\outside\\other.yaml');

    expect(getByTestId('tab-file')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('spec-source-file-button')).toHaveTextContent('other.yaml');

    fireEvent.click(getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ sourceUrl: 'C:\\ws\\outside\\other.yaml' })
    ));
  });
});
