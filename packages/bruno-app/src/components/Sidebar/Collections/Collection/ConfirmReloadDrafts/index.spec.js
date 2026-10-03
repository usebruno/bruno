import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import ConfirmReloadDrafts from './index';
import { reloadCollection } from 'providers/ReduxStore/slices/collections/actions';
import { deleteCollectionDraft } from 'providers/ReduxStore/slices/collections';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  saveRequest: jest.fn(),
  saveMultipleRequests: jest.fn(),
  saveMultipleCollections: jest.fn(),
  saveMultipleFolders: jest.fn(),
  reloadCollection: jest.fn(() => Promise.resolve())
}));

jest.mock('providers/ReduxStore/slices/collections', () => ({
  deleteRequestDraft: jest.fn((payload) => ({ type: 'deleteRequestDraft', payload })),
  deleteCollectionDraft: jest.fn((payload) => ({ type: 'deleteCollectionDraft', payload }))
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

jest.mock('./StyledWrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('components/Modal', () => ({ children }) => <div>{children}</div>);

jest.mock('ui/Button', () => ({ children, onClick }) => <button onClick={onClick}>{children}</button>);

describe('ConfirmReloadDrafts', () => {
  let mockDispatch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch = jest.fn((action) => action);
    useDispatch.mockReturnValue(mockDispatch);
  });

  it('discards the collection-level draft before reloading', () => {
    const collections = [
      { uid: 'c1', name: 'Collection 1', pathname: '/path/to/c1', brunoConfig: {}, items: [], draft: { root: {} } }
    ];
    useSelector.mockImplementation((selector) => selector({ collections: { collections } }));

    render(<ConfirmReloadDrafts collectionUid="c1" onClose={jest.fn()} />);
    fireEvent.click(screen.getByText('Discard and Reload'));

    expect(deleteCollectionDraft).toHaveBeenCalledWith({ collectionUid: 'c1' });
    expect(reloadCollection).toHaveBeenCalledWith({
      collectionUid: 'c1',
      collectionPathname: '/path/to/c1',
      brunoConfig: {}
    });
    expect(deleteCollectionDraft.mock.invocationCallOrder[0]).toBeLessThan(reloadCollection.mock.invocationCallOrder[0]);
  });
});
