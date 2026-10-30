import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { importCollection } from 'providers/ReduxStore/slices/collections/actions';
import { toastError } from 'utils/common/error';
import { isDirectory } from 'utils/filesystem';
import GenerateCollectionFromSpec from './index';

jest.mock('react-redux', () => ({ useDispatch: jest.fn() }));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() }
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  importCollection: jest.fn()
}));

jest.mock('utils/common/error', () => ({ toastError: jest.fn() }));

jest.mock('utils/filesystem', () => ({ isDirectory: jest.fn() }));

let mockImportStepProps;
jest.mock('components/Sidebar/ImportCollectionLocation', () => (props) => {
  mockImportStepProps = props;
  return (
    <button type="button" onClick={() => props.handleSubmit({ name: 'Converted' }, '/collections', { format: 'yml' })}>
      import
    </button>
  );
});

const apiSpec = {
  uid: 'spec-1',
  pathname: '/workspace/specs/petstore.yaml',
  raw: 'openapi: 3.0.0',
  json: { openapi: '3.0.0', info: { title: 'Petstore' } },
  resolvedJson: { openapi: '3.0.0', info: { title: 'Petstore' }, paths: {} }
};

const renderStep = () => {
  const onClose = jest.fn();
  render(<GenerateCollectionFromSpec apiSpec={apiSpec} onClose={onClose} />);
  return { onClose };
};

describe('GenerateCollectionFromSpec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDispatch.mockReturnValue((action) => action);
    importCollection.mockImplementation(() => Promise.resolve({ uid: 'collection-1' }));
  });

  it('hands the parsed spec to the existing import location step', () => {
    renderStep();

    expect(mockImportStepProps).toEqual(expect.objectContaining({
      rawData: apiSpec.resolvedJson,
      format: 'openapi',
      filePath: apiSpec.pathname,
      rawContent: apiSpec.raw
    }));
  });

  it('imports the converted collection and closes on success', async () => {
    const { onClose } = renderStep();

    fireEvent.click(screen.getByText('import'));

    expect(importCollection).toHaveBeenCalledWith({ name: 'Converted' }, '/collections', { format: 'yml' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('reports a failed import and stays open when nothing was imported into an existing folder', async () => {
    importCollection.mockImplementation(() => Promise.resolve(undefined));
    isDirectory.mockResolvedValue(true);
    const { onClose } = renderStep();

    fireEvent.click(screen.getByText('import'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to generate collection'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('names the missing folder when nothing was imported because the location does not exist', async () => {
    importCollection.mockImplementation(() => Promise.resolve(undefined));
    isDirectory.mockResolvedValue(false);
    renderStep();

    fireEvent.click(screen.getByText('import'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'Failed to generate collection: /collections is not an existing folder'
    ));
  });

  it('shows the error and stays open when the import fails', async () => {
    const failure = new Error('disk full');
    importCollection.mockImplementation(() => Promise.reject(failure));
    const { onClose } = renderStep();

    fireEvent.click(screen.getByText('import'));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(failure, 'Failed to generate collection'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores a second submit while the first import is still running, then accepts one after it settles', async () => {
    let finish;
    importCollection.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    renderStep();

    fireEvent.click(screen.getByText('import'));
    fireEvent.click(screen.getByText('import'));
    expect(importCollection).toHaveBeenCalledTimes(1);

    finish(undefined);
    isDirectory.mockResolvedValue(true);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    await act(async () => {});

    fireEvent.click(screen.getByText('import'));
    expect(importCollection).toHaveBeenCalledTimes(2);
  });
});
