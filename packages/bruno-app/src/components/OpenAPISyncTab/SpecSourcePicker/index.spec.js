import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import {
  renderWithWorkspaceSpecs,
  stubTabWidths,
  validOpenApiSpec,
  workspaceSpec
} from 'components/OpenAPISyncTab/testUtils';
import SpecSourcePicker from './index';

const swaggerJson = { swagger: '2.0', info: { title: 'Legacy' }, paths: {} };
const petsSpec = workspaceSpec('pets', 'Pets', '/ws/specs/pets.yaml');
const zooSpec = workspaceSpec('zoo', 'Zoo', '/ws/specs/zoo.yaml');
const swaggerSpec = workspaceSpec('legacy', 'Legacy', '/ws/specs/legacy.yaml', swaggerJson);

const renderPicker = ({ specs = [zooSpec, petsSpec], ...props } = {}) => {
  const handlers = { onModeChange: jest.fn(), onChange: jest.fn(), onError: jest.fn() };
  const utils = renderWithWorkspaceSpecs(
    <SpecSourcePicker mode="workspace" value="" {...handlers} {...props} />,
    specs
  );

  return { ...utils, ...handlers };
};

describe('SpecSourcePicker', () => {
  const originalIpcRenderer = window.ipcRenderer;

  stubTabWidths();

  afterEach(() => {
    window.ipcRenderer = originalIpcRenderer;
  });

  describe('tabs', () => {
    it('shows Workspace, URL and File tabs in that order', async () => {
      const { findAllByRole } = renderPicker();

      const tabs = await findAllByRole('tab');
      expect(tabs.map((tab) => tab.textContent)).toEqual(['Workspace', 'URL', 'File']);
    });

    it('reports the tab the user picks', async () => {
      const { findByTestId, onModeChange } = renderPicker();

      fireEvent.click(await findByTestId('responsive-tab-url'));

      expect(onModeChange).toHaveBeenCalledWith('url');
    });
  });

  describe('workspace mode', () => {
    it('lists the workspace specs by name after a placeholder, with nothing selected', () => {
      const { getByTestId } = renderPicker();
      const select = getByTestId('spec-source-workspace-select');

      expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
        'Select an API spec',
        'Pets',
        'Zoo'
      ]);
      expect(select).toHaveValue('');
    });

    it('draws its own chevron inside the dropdown', () => {
      const { getByTestId } = renderPicker();

      expect(getByTestId('spec-source-workspace-select').parentElement.querySelector('.select-caret')).toBeInTheDocument();
    });

    it('shows the spec at the current path as selected', () => {
      const { getByTestId } = renderPicker({ value: '/ws/specs/zoo.yaml' });

      expect(getByTestId('spec-source-workspace-select')).toHaveValue('zoo');
    });

    it('reports the path of the picked spec', () => {
      const { getByTestId, onChange, onError } = renderPicker();

      fireEvent.change(getByTestId('spec-source-workspace-select'), { target: { value: 'pets' } });

      expect(onError).toHaveBeenCalledWith(null);
      expect(onChange).toHaveBeenCalledWith('/ws/specs/pets.yaml');
    });

    it('rejects a picked spec that is not OpenAPI 3.x and clears the value', () => {
      const { getByTestId, onChange, onError } = renderPicker({ specs: [petsSpec, swaggerSpec] });

      fireEvent.change(getByTestId('spec-source-workspace-select'), { target: { value: 'legacy' } });

      expect(onError).toHaveBeenCalledWith('Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.');
      expect(onChange).toHaveBeenCalledWith('');
    });

    it('says the workspace has no specs and disables the list when there are none', () => {
      const { getByTestId } = renderPicker({ specs: [] });
      const select = getByTestId('spec-source-workspace-select');

      expect(select).toBeDisabled();
      expect(select).toHaveDisplayValue('No API specs in this workspace');
    });
  });

  describe('url mode', () => {
    it('reports what the user types', () => {
      const { getByTestId, onChange } = renderPicker({ mode: 'url' });

      fireEvent.change(getByTestId('spec-source-url-input'), { target: { value: 'https://api.example.com/openapi.json' } });

      expect(onChange).toHaveBeenCalledWith('https://api.example.com/openapi.json');
    });
  });

  describe('file mode', () => {
    const chooseFile = (getByTestId, contents, name = 'pets.json') => {
      const file = new File([contents], name, { type: 'application/json' });
      file.text = () => Promise.resolve(contents);
      fireEvent.change(getByTestId('spec-source-file-input'), { target: { files: [file] } });
    };

    it('prompts to select a file when nothing is chosen', () => {
      const { getByTestId } = renderPicker({ mode: 'file' });

      expect(getByTestId('spec-source-file-button')).toHaveTextContent('Select File');
    });

    it('shows the name of the chosen file', () => {
      const { getByTestId } = renderPicker({ mode: 'file', value: '/specs/pets.json' });

      expect(getByTestId('spec-source-file-button')).toHaveTextContent('pets.json');
    });

    it('reports the path of a valid OpenAPI file', async () => {
      window.ipcRenderer = { getFilePath: jest.fn().mockReturnValue('/specs/pets.json') };
      const { getByTestId, onChange } = renderPicker({ mode: 'file' });

      chooseFile(getByTestId, JSON.stringify(validOpenApiSpec));

      await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('/specs/pets.json'));
    });

    it('rejects a file that is not OpenAPI 3.x', async () => {
      window.ipcRenderer = { getFilePath: jest.fn().mockReturnValue('/specs/legacy.json') };
      const { getByTestId, onChange, onError } = renderPicker({ mode: 'file' });

      chooseFile(getByTestId, JSON.stringify(swaggerJson), 'legacy.json');

      await waitFor(() => expect(onError).toHaveBeenLastCalledWith(
        'Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.'
      ));
      expect(onChange).not.toHaveBeenCalledWith('/specs/legacy.json');
    });

    it('reports a file that cannot be parsed', async () => {
      const { getByTestId, onError } = renderPicker({ mode: 'file' });

      chooseFile(getByTestId, '{ not json');

      await waitFor(() => expect(onError).toHaveBeenLastCalledWith(
        'Failed to parse the file – ensure it is valid JSON or YAML'
      ));
    });
  });

  it('renders the action next to the source input', () => {
    const { getByRole } = renderPicker({ action: <button type="submit">Connect</button> });

    expect(getByRole('button', { name: 'Connect' })).toBeInTheDocument();
  });
});
