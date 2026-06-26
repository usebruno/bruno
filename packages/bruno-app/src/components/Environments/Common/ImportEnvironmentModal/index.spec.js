import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, fireEvent, createEvent } from '@testing-library/react';

jest.mock('components/Portal', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('components/Modal', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('@tabler/icons', () => ({ __esModule: true, IconFileImport: () => null }));

jest.mock('react-hot-toast', () => {
  const fn = jest.fn();
  fn.success = jest.fn();
  fn.error = jest.fn();
  return { __esModule: true, default: fn };
});

let mockDispatch;
let mockSelectorState;
jest.mock('react-redux', () => ({
  __esModule: true,
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockSelectorState)
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  __esModule: true,
  importEnvironment: jest.fn((payload) => ({ thunk: 'importEnvironment', ...payload }))
}));
jest.mock('providers/ReduxStore/slices/global-environments', () => ({
  __esModule: true,
  addGlobalEnvironment: jest.fn((payload) => ({ thunk: 'addGlobalEnvironment', ...payload }))
}));

jest.mock('utils/importers/postman-environment', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('utils/importers/bruno-environment', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('utils/importers/file-reader', () => ({ __esModule: true, readMultipleFiles: jest.fn() }));

import toast from 'react-hot-toast';
import { importEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { addGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import importPostmanEnvironment from 'utils/importers/postman-environment';
import importBrunoEnvironment from 'utils/importers/bruno-environment';
import { readMultipleFiles } from 'utils/importers/file-reader';
import ImportEnvironmentModal from './index';

const brunoContent = (envs) => ({ info: { type: 'bruno-environment' }, envs });
const postmanContent = (envs) => ({ id: 'pm-id', values: [], envs });

const makeFile = (name) => new File(['{}'], name, { type: 'application/json' });
const collectionWith = (environments) => ({ uid: 'col-1', name: 'Col', environments });

// map: { 'file.json': { content } | { error } }
const setupFiles = (map) => {
  readMultipleFiles.mockImplementation(async (files) => {
    const file = files[0];
    const entry = map[file.name];
    if (!entry || entry.error) {
      throw new Error(entry?.error || `Unable to parse JSON file: ${file.name}`);
    }
    return [{ fileName: file.name, content: entry.content }];
  });
};

const dropFiles = (testId, files) => {
  const node = screen.getByTestId(testId);
  const event = createEvent.drop(node);
  Object.defineProperty(event, 'dataTransfer', { value: { files } });
  fireEvent(node, event);
};

const renderModal = (props = {}) =>
  render(<ImportEnvironmentModal type="collection" onClose={() => {}} onEnvironmentCreated={() => {}} {...props} />);

describe('ImportEnvironmentModal — batch import summary', () => {
  beforeEach(() => {
    mockDispatch = jest.fn(() => Promise.resolve());
    mockSelectorState = { globalEnvironments: { globalEnvironments: [] } };

    const passthrough = async ([parsedFile]) => {
      if (parsedFile.content.importError) throw new Error(parsedFile.content.importError);
      return parsedFile.content.envs || [];
    };
    importBrunoEnvironment.mockImplementation(passthrough);
    importPostmanEnvironment.mockImplementation(passthrough);
  });

  it('imports a mix of Bruno and Postman files and reports the combined count', async () => {
    setupFiles({
      'bruno.json': { content: brunoContent([{ name: 'B1', variables: [] }]) },
      'postman.json': { content: postmanContent([{ name: 'P1', variables: [] }]) }
    });
    const onClose = jest.fn();
    const onEnvironmentCreated = jest.fn();
    renderModal({ collection: collectionWith([]), onClose, onEnvironmentCreated });

    dropFiles('import-environment', [makeFile('bruno.json'), makeFile('postman.json')]);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Imported 2 environments.'));
    expect(importBrunoEnvironment).toHaveBeenCalledTimes(1);
    expect(importPostmanEnvironment).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onEnvironmentCreated).toHaveBeenCalled();
  });

  it('imports valid files even when one file is malformed, and reports the failure', async () => {
    setupFiles({
      'good1.json': { content: brunoContent([{ name: 'Good1', variables: [] }]) },
      'bad.json': { error: 'Unable to parse JSON file: bad.json' },
      'good2.json': { content: postmanContent([{ name: 'Good2', variables: [] }]) }
    });
    renderModal({ collection: collectionWith([]) });

    dropFiles('import-environment', [makeFile('good1.json'), makeFile('bad.json'), makeFile('good2.json')]);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Imported 2 environments.'));
    expect(mockDispatch).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('1 failed (bad.json)')));
  });

  it('skips environments whose name already exists', async () => {
    setupFiles({ 'dup.json': { content: brunoContent([{ name: 'Existing', variables: [] }]) } });
    const onClose = jest.fn();
    const onEnvironmentCreated = jest.fn();
    renderModal({ collection: collectionWith([{ name: 'Existing' }]), onClose, onEnvironmentCreated });

    dropFiles('import-environment', [makeFile('dup.json')]);

    await waitFor(() => expect(toast).toHaveBeenCalledWith('1 already existed and was skipped.'));
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onEnvironmentCreated).not.toHaveBeenCalled();
  });

  it('counts unnamed Postman environments while still importing the named ones', async () => {
    // The Bruno importer defaults missing names to 'Imported Environment', so a
    // genuinely nameless environment only reaches processEnvironments via Postman.
    setupFiles({
      'mixed.postman.json': { content: postmanContent([{ name: 'Named', variables: [] }, { variables: [] }]) }
    });
    renderModal({ collection: collectionWith([]) });

    dropFiles('import-environment', [makeFile('mixed.postman.json')]);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Imported 1 environment.'));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('1 had no name.'));
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('treats non-string and empty-after-sanitize names as unnamed', async () => {
    setupFiles({
      'odd.json': {
        content: brunoContent([
          { name: 12345, variables: [] },
          { name: '///', variables: [] },
          { name: 'Valid', variables: [] }
        ])
      }
    });
    renderModal({ collection: collectionWith([]) });

    dropFiles('import-environment', [makeFile('odd.json')]);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Imported 1 environment.'));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('2 had no name.'));
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('reports a failure when an environment fails to dispatch but imports the rest', async () => {
    setupFiles({
      'two.json': { content: brunoContent([{ name: 'Ok', variables: [] }, { name: 'Will-Fail', variables: [] }]) }
    });
    mockDispatch.mockImplementation((action) => {
      if (action.name === 'Will-Fail') return Promise.reject(new Error('disk full'));
      return Promise.resolve();
    });
    renderModal({ collection: collectionWith([]) });

    dropFiles('import-environment', [makeFile('two.json')]);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Imported 1 environment.'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('1 failed (Will-Fail)')));
    expect(mockDispatch).toHaveBeenCalledTimes(2);
  });

  it('reports when nothing valid was found to import', async () => {
    setupFiles({ 'empty.json': { content: brunoContent([]) } });
    const onClose = jest.fn();
    renderModal({ collection: collectionWith([]), onClose });

    dropFiles('import-environment', [makeFile('empty.json')]);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No valid environments found to import.'));
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  describe('name normalization', () => {
    it('passes a sanitized name to importEnvironment for collection imports', async () => {
      setupFiles({
        'env.json': { content: brunoContent([{ name: 'Prod/Env', variables: [{ name: 'k' }], color: 'red' }]) }
      });
      renderModal({ type: 'collection', collection: collectionWith([]) });

      dropFiles('import-environment', [makeFile('env.json')]);

      await waitFor(() => expect(importEnvironment).toHaveBeenCalledTimes(1));
      expect(importEnvironment).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Prod-Env', collectionUid: 'col-1' })
      );
    });

    it('passes a sanitized name to addGlobalEnvironment for global imports', async () => {
      setupFiles({
        'env.json': { content: brunoContent([{ name: 'Prod/Env', variables: [{ name: 'k' }], color: 'red' }]) }
      });
      mockSelectorState = { globalEnvironments: { globalEnvironments: [] } };
      renderModal({ type: 'global', collection: undefined });

      dropFiles('import-global-environment', [makeFile('env.json')]);

      await waitFor(() => expect(addGlobalEnvironment).toHaveBeenCalledTimes(1));
      expect(addGlobalEnvironment).toHaveBeenCalledWith(expect.objectContaining({ name: 'Prod-Env' }));
    });
  });
});
