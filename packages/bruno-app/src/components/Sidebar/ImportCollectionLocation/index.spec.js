import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import ImportCollectionLocation from './index';

const mockDispatch = jest.fn();
let consoleErrorSpy;

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) =>
    selector({
      app: {
        preferences: {
          general: {
            defaultLocation: '/tmp/bruno-collections'
          }
        }
      },
      workspaces: {
        workspaces: [],
        activeWorkspaceUid: null
      }
    })
}));

jest.mock('react-hot-toast', () => ({
  error: jest.fn()
}));

jest.mock('components/Modal', () => {
  const React = require('react');

  return function MockModal({ children, confirmText, handleConfirm }) {
    return (
      <div>
        {children}
        <button type="button" onClick={handleConfirm}>
          {confirmText}
        </button>
      </div>
    );
  };
});

jest.mock('components/Help', () => {
  const React = require('react');

  return function MockHelp({ children }) {
    return <span>{children}</span>;
  };
});

jest.mock('components/Dropdown', () => {
  const React = require('react');

  return function MockDropdown({ children }) {
    return <div>{children}</div>;
  };
});

jest.mock('./StyledWrapper', () => {
  const React = require('react');

  return function MockStyledWrapper({ children }) {
    return <div>{children}</div>;
  };
});

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectory: jest.fn()
}));

jest.mock('utils/beta-features', () => ({
  BETA_FEATURES: {
    OPENAPI_SYNC: 'openapi-sync'
  },
  useBetaFeature: jest.fn(() => false)
}));

describe('ImportCollectionLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('surfaces zip import errors returned by the Electron process', async () => {
    const ipcError = new Error(
      'Error invoking remote method \'renderer:import-collection-zip\': Error: Security error: Symlink "boilerplate.js" points outside extraction directory'
    );
    const handleSubmit = jest.fn(() => Promise.reject(ipcError));

    render(
      <ImportCollectionLocation
        onClose={jest.fn()}
        handleSubmit={handleSubmit}
        format="bruno-zip"
        rawData={{
          zipFilePath: '/tmp/collection.zip',
          collectionName: 'Collection With Symlink'
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to import collection\nSecurity error: Symlink "boilerplate.js" points outside extraction directory'
      );
    });
  });
});
