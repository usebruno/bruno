import '@testing-library/jest-dom';
import React from 'react';
import toast from 'react-hot-toast';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithWorkspaceSpecs, stubTabWidths, workspaceSpec } from 'components/OpenAPISyncTab/testUtils';
import ConnectionSettingsModal from './index';

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

const petsSpec = workspaceSpec('pets', 'Pets', '/ws/specs/pets.yaml');
const zooSpec = workspaceSpec('zoo', 'Zoo', '/ws/specs/zoo.yaml');
const swaggerSpec = workspaceSpec('legacy', 'Legacy', '/ws/specs/legacy.yaml', {
  swagger: '2.0',
  info: { title: 'Legacy' },
  paths: {}
});

const collectionWithSource = (sourceUrl) => ({
  pathname: '/ws/collections/pets-api',
  brunoConfig: { openapi: [{ sourceUrl, autoCheck: true, autoCheckInterval: 15 }] }
});

const renderModal = (sourceUrl, specs = [petsSpec, zooSpec, swaggerSpec]) => {
  const onSave = jest.fn().mockResolvedValue();
  const utils = renderWithWorkspaceSpecs(
    <ConnectionSettingsModal
      collection={collectionWithSource(sourceUrl)}
      sourceUrl={sourceUrl}
      onSave={onSave}
      onDisconnect={jest.fn()}
      onClose={jest.fn()}
    />,
    specs
  );
  return { ...utils, onSave };
};

describe('ConnectionSettingsModal', () => {
  stubTabWidths();

  afterEach(() => {
    toast.error.mockClear();
  });

  it('opens on the Workspace tab with the connected workspace spec selected', async () => {
    const { findByTestId, getByTestId } = renderModal('../../specs/pets.yaml');

    expect(await findByTestId('responsive-tab-workspace')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('spec-source-workspace-select')).toHaveValue('pets');
  });

  it('opens on the File tab for a file outside the workspace', async () => {
    const { findByTestId, getByTestId } = renderModal('../../../downloads/other.yaml');

    expect(await findByTestId('responsive-tab-file')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('spec-source-file-button')).toHaveTextContent('other.yaml');
  });

  it('opens on the URL tab for a URL source', async () => {
    const { findByTestId, getByTestId } = renderModal('https://api.example.com/openapi.json');

    expect(await findByTestId('responsive-tab-url')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('spec-source-url-input')).toHaveValue('https://api.example.com/openapi.json');
  });

  it('saves the path of a newly picked workspace spec with the auto-check settings', async () => {
    const { getByRole, getByTestId, onSave } = renderModal('../../specs/pets.yaml');

    fireEvent.change(getByTestId('spec-source-workspace-select'), { target: { value: 'zoo' } });
    fireEvent.click(getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      sourceUrl: '/ws/specs/zoo.yaml',
      autoCheck: true,
      autoCheckInterval: 15
    }));
  });

  it('keeps the connected source when saved without changes', async () => {
    const { getByRole, onSave } = renderModal('../../specs/pets.yaml');

    fireEvent.click(getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ sourceUrl: '/ws/specs/pets.yaml' })
    ));
  });

  it('reports a picked spec that is not OpenAPI 3.x and blocks saving', () => {
    const { getByRole, getByTestId } = renderModal('../../specs/pets.yaml');

    fireEvent.change(getByTestId('spec-source-workspace-select'), { target: { value: 'legacy' } });

    expect(toast.error).toHaveBeenCalledWith('Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.');
    expect(getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('blocks saving on a tab that has no source yet', async () => {
    const { findByTestId, getByRole } = renderModal('../../specs/pets.yaml');

    fireEvent.click(await findByTestId('responsive-tab-file'));
    expect(getByRole('button', { name: 'Save' })).toBeDisabled();

    fireEvent.click(await findByTestId('responsive-tab-url'));
    expect(getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('keeps what was entered on each tab when switching between them', async () => {
    const { findByTestId, getByTestId } = renderModal('../../specs/pets.yaml');

    fireEvent.click(await findByTestId('responsive-tab-url'));
    fireEvent.change(getByTestId('spec-source-url-input'), { target: { value: 'https://api.example.com/openapi.json' } });
    fireEvent.click(await findByTestId('responsive-tab-workspace'));

    expect(getByTestId('spec-source-workspace-select')).toHaveValue('pets');

    fireEvent.click(await findByTestId('responsive-tab-url'));
    expect(getByTestId('spec-source-url-input')).toHaveValue('https://api.example.com/openapi.json');
  });
});
