import '@testing-library/jest-dom';
import React, { useState } from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';
import {
  renderWithWorkspaceSpecs,
  validOpenApiSpec,
  workspaceSpec,
  pickWorkspaceSpec
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

  afterEach(() => {
    window.ipcRenderer = originalIpcRenderer;
  });

  describe('tabs', () => {
    it('shows Workspace, URL and File tabs in that order on the first render', () => {
      const { getAllByRole } = renderPicker();

      expect(getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Workspace', 'URL', 'File']);
    });

    it('marks the active tab as selected', () => {
      const { getByTestId } = renderPicker({ mode: 'url' });

      expect(getByTestId('tab-url')).toHaveAttribute('aria-selected', 'true');
      expect(getByTestId('tab-workspace')).toHaveAttribute('aria-selected', 'false');
    });

    it('names the tab list and links the active tab to its panel', () => {
      const { getByRole } = renderPicker({ mode: 'url' });
      const panel = getByRole('tabpanel');
      const activeTab = getByRole('tab', { name: 'URL' });

      expect(getByRole('tablist', { name: 'Spec source' })).toBeInTheDocument();
      expect(activeTab).toHaveAttribute('aria-controls', panel.id);
      expect(panel).toHaveAttribute('aria-labelledby', activeTab.id);
    });

    it('lets keyboard users focus every tab', () => {
      const { getAllByRole } = renderPicker();

      getAllByRole('tab').forEach((tab) => expect(tab).toHaveAttribute('tabindex', '0'));
    });

    it('switches tab with Enter and with Space', () => {
      const { getByTestId, onModeChange } = renderPicker();

      fireEvent.keyDown(getByTestId('tab-url'), { key: 'Enter' });
      fireEvent.keyDown(getByTestId('tab-file'), { key: ' ' });

      expect(onModeChange).toHaveBeenNthCalledWith(1, 'url');
      expect(onModeChange).toHaveBeenNthCalledWith(2, 'file');
    });

    it('reports the tab the user picks', () => {
      const { getByTestId, onModeChange } = renderPicker();

      fireEvent.click(getByTestId('tab-url'));

      expect(onModeChange).toHaveBeenCalledWith('url');
    });
  });

  describe('workspace mode', () => {
    it('shows a placeholder with nothing selected', () => {
      const { getByTestId } = renderPicker();

      expect(getByTestId('spec-source-workspace-select')).toHaveTextContent(/^Select an API spec$/);
    });

    it('lists the workspace specs in the order the workspace keeps them', () => {
      const { getByTestId, getAllByRole } = renderPicker();

      fireEvent.click(getByTestId('spec-source-workspace-select'));

      expect(getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Zoo', 'Pets']);
    });

    it('announces the dropdown with its label and the placeholder when nothing is picked', () => {
      const { getByRole } = renderPicker();

      expect(getByRole('button', { name: 'API spec Select an API spec' })).toBeInTheDocument();
    });

    it('announces the picked spec in the dropdown name', () => {
      const { getByRole } = renderPicker({ value: '/ws/specs/zoo.yaml' });

      expect(getByRole('button', { name: 'API spec Zoo' })).toBeInTheDocument();
    });

    it('announces the empty workspace message in the dropdown name', () => {
      const { getByRole } = renderPicker({ specs: [] });

      expect(getByRole('button', { name: 'API spec No API specs in this workspace' })).toBeInTheDocument();
    });

    it('draws a chevron inside the dropdown', () => {
      const { getByTestId } = renderPicker();

      expect(getByTestId('spec-source-workspace-select').querySelector('.caret')).toBeInTheDocument();
    });

    it('shows the spec at the current path as selected', () => {
      const { getByTestId } = renderPicker({ value: '/ws/specs/zoo.yaml' });

      expect(getByTestId('spec-source-workspace-select')).toHaveTextContent('Zoo');
    });

    it('reports the path of the picked spec', () => {
      const { getByTestId, onChange, onError } = renderPicker();

      pickWorkspaceSpec(getByTestId, 'pets');

      expect(onError).toHaveBeenCalledWith(null);
      expect(onChange).toHaveBeenCalledWith('/ws/specs/pets.yaml');
    });

    it('rejects a picked spec that is not OpenAPI 3.x and leaves the value as it is', () => {
      const { getByTestId, onChange, onError } = renderPicker({ specs: [petsSpec, swaggerSpec] });

      pickWorkspaceSpec(getByTestId, 'legacy');

      expect(onError).toHaveBeenCalledWith('Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.');
      expect(onChange).not.toHaveBeenCalled();
    });

    it.each([
      ['failed to parse', null],
      ['parsed to plain text', 'just some text']
    ])('reports a workspace spec that %s with the same error as browsing it', (_, json) => {
      const brokenSpec = workspaceSpec('broken', 'Broken', '/ws/specs/broken.yaml', json);
      const { getByTestId, onChange, onError } = renderPicker({ specs: [petsSpec, brokenSpec] });

      pickWorkspaceSpec(getByTestId, 'broken');

      expect(onError).toHaveBeenCalledWith('Failed to parse the file – ensure it is valid JSON or YAML');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('says the workspace has no specs and disables the dropdown when there are none', () => {
      const { getByTestId } = renderPicker({ specs: [] });
      const trigger = getByTestId('spec-source-workspace-select');

      expect(trigger).toBeDisabled();
      expect(trigger).toHaveTextContent('No API specs in this workspace');
    });
  });

  describe('url mode', () => {
    it('gives the URL input an accessible name', () => {
      const { getByRole } = renderPicker({ mode: 'url' });

      expect(getByRole('textbox', { name: 'OpenAPI spec URL' })).toBeInTheDocument();
    });

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
      expect(onChange).not.toHaveBeenCalled();
    });

    it('clears the file input so the same file can be picked again', () => {
      window.ipcRenderer = { getFilePath: jest.fn().mockReturnValue('/specs/pets.json') };
      const setValue = jest.spyOn(HTMLInputElement.prototype, 'value', 'set');
      const { getByTestId } = renderPicker({ mode: 'file' });

      chooseFile(getByTestId, JSON.stringify(validOpenApiSpec));

      expect(setValue).toHaveBeenCalledWith('');
      setValue.mockRestore();
    });

    it('reports a file that cannot be parsed and leaves the value as it is', async () => {
      const { getByTestId, onChange, onError } = renderPicker({ mode: 'file', value: '/specs/pets.json' });

      chooseFile(getByTestId, '{ not json');

      await waitFor(() => expect(onError).toHaveBeenLastCalledWith(
        'Failed to parse the file – ensure it is valid JSON or YAML'
      ));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('ignores a file that finishes reading after the user left the File tab', async () => {
    window.ipcRenderer = { getFilePath: jest.fn().mockReturnValue('/specs/pets.json') };
    const onChange = jest.fn();
    const onError = jest.fn();
    const PickerHost = () => {
      const [mode, setMode] = useState('file');
      return <SpecSourcePicker mode={mode} onModeChange={setMode} value="" onChange={onChange} onError={onError} />;
    };
    const { getByTestId } = renderWithWorkspaceSpecs(<PickerHost />, [petsSpec]);

    let finishReading;
    const file = new File(['{}'], 'pets.json', { type: 'application/json' });
    file.text = () => new Promise((resolve) => {
      finishReading = resolve;
    });
    fireEvent.change(getByTestId('spec-source-file-input'), { target: { files: [file] } });
    onChange.mockClear();
    onError.mockClear();

    fireEvent.click(getByTestId('tab-url'));
    await act(async () => finishReading(JSON.stringify(validOpenApiSpec)));

    expect(onChange).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('keeps the latest file when an earlier pick finishes reading later', async () => {
    window.ipcRenderer = { getFilePath: jest.fn((file) => `/specs/${file.name}`) };
    const { getByTestId, onChange } = renderPicker({ mode: 'file' });

    let finishFirstPick;
    const firstFile = new File(['{}'], 'first.json', { type: 'application/json' });
    firstFile.text = () => new Promise((resolve) => {
      finishFirstPick = resolve;
    });
    const secondFile = new File(['{}'], 'second.json', { type: 'application/json' });
    secondFile.text = () => Promise.resolve(JSON.stringify(validOpenApiSpec));

    fireEvent.change(getByTestId('spec-source-file-input'), { target: { files: [firstFile] } });
    fireEvent.change(getByTestId('spec-source-file-input'), { target: { files: [secondFile] } });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('/specs/second.json'));

    await act(async () => finishFirstPick(JSON.stringify(validOpenApiSpec)));

    expect(onChange).not.toHaveBeenCalledWith('/specs/first.json');
    expect(onChange).toHaveBeenLastCalledWith('/specs/second.json');
  });

  it('uses the compact settings look when asked for the settings variant', () => {
    const { container } = renderPicker({ variant: 'settings' });

    expect(container.firstChild).toHaveClass('settings');
  });

  it('renders the action next to the source input', () => {
    const { getByRole } = renderPicker({ action: <button type="submit">Connect</button> });

    expect(getByRole('button', { name: 'Connect' })).toBeInTheDocument();
  });
});
