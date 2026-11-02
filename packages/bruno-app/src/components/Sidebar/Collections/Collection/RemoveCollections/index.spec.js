import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import RemoveCollections from './index';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';
import { clearSidebarSelection } from 'providers/ReduxStore/slices/collections';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  removeCollection: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections', () => ({
  clearSidebarSelection: jest.fn()
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

jest.mock('utils/collections/index', () => ({
  ...jest.requireActual('utils/collections/index'),
  findCollectionByUid: jest.fn((collections, uid) => collections.find((c) => c.uid === uid)),
  getCollectionDrafts: jest.fn(() => ({ requestDrafts: [], transientDrafts: [], folderDrafts: [], collectionDrafts: [] }))
}));

// Mock Portal to just render children so modal appears in DOM
jest.mock('ui/Portal', () => ({ children }) => <div>{children}</div>);

// Mock StyledWrapper to prevent theme errors
jest.mock('./StyledWrapper', () => ({ children }) => <div>{children}</div>);

// Mock Modal to prevent theme errors
jest.mock('components/Modal', () => ({ children, handleConfirm }) => (
  <div>
    {children}
    <button onClick={handleConfirm}>Remove All</button>
  </div>
));

describe('RemoveCollections', () => {
  let mockDispatch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch = jest.fn((action) => {
      if (typeof action === 'function') {
        return action(mockDispatch);
      }
      return action;
    });
    useDispatch.mockReturnValue(mockDispatch);
  });

  it('waits for all removal promises to settle, leaves modal open on partial failure, and reports failed collections', async () => {
    const mockOnClose = jest.fn();
    const collections = [
      { uid: 'c1', name: 'Collection 1', pathname: '/path/to/c1' },
      { uid: 'c2', name: 'Collection 2', pathname: '/path/to/c2' }
    ];
    useSelector.mockImplementation((selector) => selector({ collections: { collections } }));

    // Simulate one delayed successful removal, and one rejected removal
    let resolveFirst;
    let rejectSecond;
    const firstPromise = new Promise((resolve) => { resolveFirst = resolve; });
    const secondPromise = new Promise((resolve, reject) => { rejectSecond = reject; });

    removeCollection.mockImplementation((uid) => {
      if (uid === 'c1') return firstPromise;
      if (uid === 'c2') return secondPromise;
    });

    render(<RemoveCollections onClose={mockOnClose} collectionUids={['c1', 'c2']} />);

    // Click confirm button
    const confirmButton = screen.getByText('Remove All');
    fireEvent.click(confirmButton);

    expect(mockDispatch).toHaveBeenCalledWith(firstPromise);
    expect(mockDispatch).toHaveBeenCalledWith(secondPromise);

    // At this point, neither has settled, so onClose should not be called
    expect(mockOnClose).not.toHaveBeenCalled();

    // Settle both
    resolveFirst();
    rejectSecond(new Error('Failed to delete c2'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to remove: Collection 2');
    });

    // Ensure onClose and clearSidebarSelection were NOT called because of failure
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(clearSidebarSelection).not.toHaveBeenCalled();
  });
});
