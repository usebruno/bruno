import '@testing-library/jest-dom';
import React from 'react';
import toast from 'react-hot-toast';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithWorkspaceSpecs, workspaceSpec, pickWorkspaceSpec } from 'components/OpenAPISyncTab/testUtils';
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
  afterEach(() => {
    toast.error.mockClear();
  });

  it('opens on the Workspace tab with the connected workspace spec selected', async () => {
    const { findByTestId, getByTestId } = renderModal('../../specs/pets.yaml');

    expect(await findByTestId('tab-workspace')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('spec-source-workspace-select')).toHaveTextContent('Pets');
  });

  it('opens on the Workspace tab for an older connection stored as an absolute path', () => {
    const { getByTestId } = renderModal('/ws/specs/zoo.yaml');

    expect(getByTestId('tab-workspace')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('spec-source-workspace-select')).toHaveTextContent('Zoo');
  });

  it('moves to the Workspace tab when the connected spec loads after the modal opens', () => {
    const { getByTestId, setWorkspaceSpecs } = renderModal('../../specs/pets.yaml', []);
    expect(getByTestId('tab-file')).toHaveAttribute('aria-selected', 'true');

    setWorkspaceSpecs([petsSpec, zooSpec]);

    expect(getByTestId('tab-workspace')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('spec-source-workspace-select')).toHaveTextContent('Pets');
  });

  it('keeps the tab the user chose when workspace specs load later', () => {
    const { getByTestId, setWorkspaceSpecs } = renderModal('../../specs/pets.yaml', []);
    fireEvent.click(getByTestId('tab-url'));

    setWorkspaceSpecs([petsSpec, zooSpec]);

    expect(getByTestId('tab-url')).toHaveAttribute('aria-selected', 'true');
  });

  it('names the source tabs without an orphan label element', () => {
    const { getByRole, getByText } = renderModal('../../specs/pets.yaml');

    expect(getByRole('tablist', { name: 'Spec source' })).toBeInTheDocument();
    expect(getByText('Spec Source').tagName).not.toBe('LABEL');
  });

  it('opens on the File tab for a file outside the workspace', async () => {
    const { findByTestId, getByTestId } = renderModal('../../../downloads/other.yaml');

    expect(await findByTestId('tab-file')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('spec-source-file-button')).toHaveTextContent('other.yaml');
  });

  it('opens on the URL tab for a URL source', async () => {
    const { findByTestId, getByTestId } = renderModal('https://api.example.com/openapi.json');

    expect(await findByTestId('tab-url')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('spec-source-url-input')).toHaveValue('https://api.example.com/openapi.json');
  });

  it('saves the path of a newly picked workspace spec with the auto-check settings', async () => {
    const { getByRole, getByTestId, onSave } = renderModal('../../specs/pets.yaml');

    pickWorkspaceSpec(getByTestId, 'zoo');
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

  it('reports a picked spec that is not OpenAPI 3.x and keeps the connected spec', () => {
    const { getByRole, getByTestId } = renderModal('../../specs/pets.yaml');

    pickWorkspaceSpec(getByTestId, 'legacy');

    expect(toast.error).toHaveBeenCalledWith('Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.');
    expect(getByTestId('spec-source-workspace-select')).toHaveTextContent('Pets');
    expect(getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('keeps the connected file when a browse fails', async () => {
    const { getByRole, getByTestId } = renderModal('../../../downloads/other.yaml');
    const file = new File(['{ not json'], 'broken.json', { type: 'application/json' });
    file.text = () => Promise.resolve('{ not json');

    fireEvent.change(getByTestId('spec-source-file-input'), { target: { files: [file] } });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'Failed to parse the file – ensure it is valid JSON or YAML'
    ));
    expect(getByTestId('spec-source-file-button')).toHaveTextContent('other.yaml');
    expect(getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('blocks saving when a picked workspace spec leaves the workspace', () => {
    const { getByRole, getByTestId, setWorkspaceSpecs } = renderModal('../../specs/pets.yaml');
    pickWorkspaceSpec(getByTestId, 'zoo');
    expect(getByRole('button', { name: 'Save' })).toBeEnabled();

    setWorkspaceSpecs([petsSpec]);

    expect(getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows the connected spec on the File tab when it leaves the workspace before any edit', () => {
    const { getByTestId, setWorkspaceSpecs } = renderModal('../../specs/pets.yaml');

    setWorkspaceSpecs([zooSpec]);

    expect(getByTestId('tab-file')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('spec-source-file-button')).toHaveTextContent('pets.yaml');
  });

  it('blocks saving on a tab that has no source yet', async () => {
    const { findByTestId, getByRole } = renderModal('../../specs/pets.yaml');

    fireEvent.click(await findByTestId('tab-file'));
    expect(getByRole('button', { name: 'Save' })).toBeDisabled();

    fireEvent.click(await findByTestId('tab-url'));
    expect(getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('keeps what was entered on each tab when switching between them', async () => {
    const { findByTestId, getByTestId } = renderModal('../../specs/pets.yaml');

    fireEvent.click(await findByTestId('tab-url'));
    fireEvent.change(getByTestId('spec-source-url-input'), { target: { value: 'https://api.example.com/openapi.json' } });
    fireEvent.click(await findByTestId('tab-workspace'));

    expect(getByTestId('spec-source-workspace-select')).toHaveTextContent('Pets');

    fireEvent.click(await findByTestId('tab-url'));
    expect(getByTestId('spec-source-url-input')).toHaveValue('https://api.example.com/openapi.json');
  });
});
