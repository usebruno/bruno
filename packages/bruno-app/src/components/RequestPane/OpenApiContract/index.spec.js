import '@testing-library/jest-dom';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import OpenApiContract from './index';

const mockDispatch = jest.fn((value) => value);
const mockBrowseFiles = jest.fn();
const mockUpdateRequestBodyContract = jest.fn((payload) => ({
  type: 'collections/updateRequestBodyContract',
  payload
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch
}));

jest.mock('providers/ReduxStore/slices/collections', () => ({
  updateRequestBodyContract: (payload) => mockUpdateRequestBodyContract(payload)
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseFiles: (...args) => mockBrowseFiles(...args),
  saveRequest: jest.fn()
}));

jest.mock('hooks/useOpenApiBodySchema', () => ({
  __esModule: true,
  default: () => ({
    status: 'ready',
    operations: [
      { method: 'post', path: '/payments', operationId: 'createPayment', summary: '' }
    ],
    operationDocument: null
  })
}));

jest.mock('components/ApiSpecPanel/Renderers/Swagger', () => ({
  __esModule: true,
  default: () => null
}));

jest.mock('ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, disabled, ...props }) => (
    <button type="button" onClick={onClick} disabled={disabled} data-testid={props['data-testid']}>
      {children}
    </button>
  )
}));

const item = {
  uid: 'request-1',
  pathname: '/workspace/collection/requests/create.bru',
  request: {
    method: 'POST',
    url: 'https://api.example.com/payments',
    body: { mode: 'json' },
    bodyContract: {
      type: 'openapi',
      source: '../openapi.yaml',
      operationId: 'createPayment'
    }
  }
};

const collection = {
  uid: 'collection-1',
  pathname: '/workspace/collection',
  format: 'bru'
};

const deferred = () => {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe('OpenApiContract path conversion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockImplementation((value) => value);
    mockBrowseFiles.mockResolvedValue([]);
    window.ipcRenderer = { invoke: jest.fn() };
  });

  it('keeps the newest mode when an older absolute-path conversion finishes later', async () => {
    const conversion = deferred();
    window.ipcRenderer.invoke.mockReturnValueOnce(conversion.promise);
    render(<OpenApiContract item={item} collection={collection} />);

    const checkbox = screen.getByTestId('openapi-absolute-path');
    fireEvent.click(checkbox);
    fireEvent.click(checkbox);

    expect(mockUpdateRequestBodyContract).toHaveBeenCalledTimes(1);
    expect(mockUpdateRequestBodyContract).toHaveBeenLastCalledWith(expect.objectContaining({
      contract: expect.objectContaining({ source: '../openapi.yaml' })
    }));

    await act(async () => {
      conversion.resolve('/workspace/collection/openapi.yaml');
      await conversion.promise;
    });

    expect(mockUpdateRequestBodyContract).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite a newer file selection with a stale path conversion', async () => {
    const conversion = deferred();
    window.ipcRenderer.invoke.mockReturnValueOnce(conversion.promise);
    mockBrowseFiles.mockResolvedValueOnce(['/workspace/new-openapi.yaml']);
    render(<OpenApiContract item={item} collection={collection} />);

    fireEvent.click(screen.getByTestId('openapi-absolute-path'));
    fireEvent.click(screen.getByTestId('openapi-select-file'));

    await waitFor(() => expect(mockUpdateRequestBodyContract).toHaveBeenCalledTimes(1));
    expect(mockUpdateRequestBodyContract).toHaveBeenLastCalledWith(expect.objectContaining({
      contract: expect.objectContaining({ source: '/workspace/new-openapi.yaml' })
    }));

    await act(async () => {
      conversion.resolve('/workspace/collection/openapi.yaml');
      await conversion.promise;
    });

    expect(mockUpdateRequestBodyContract).toHaveBeenCalledTimes(1);
  });
});
