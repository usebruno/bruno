const { describe, it, expect } = require('@jest/globals');
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { renderHook } from '@testing-library/react';
import useWorkspaceApiSpecs from './index';

const renderWithState = ({ workspaces, activeWorkspaceUid, apiSpecs }) => {
  const store = configureStore({
    reducer: {
      workspaces: () => ({ workspaces, activeWorkspaceUid }),
      apiSpec: () => ({ apiSpecs })
    }
  });

  return renderHook(() => useWorkspaceApiSpecs(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
  });
};

describe('useWorkspaceApiSpecs', () => {
  it('returns the loaded specs listed in the active workspace', () => {
    const { result } = renderWithState({
      activeWorkspaceUid: 'ws-1',
      workspaces: [
        { uid: 'ws-1', apiSpecs: [{ path: '/ws1/specs/a.yaml' }] },
        { uid: 'ws-2', apiSpecs: [{ path: '/ws2/specs/b.yaml' }] }
      ],
      apiSpecs: [
        { uid: 'a', pathname: '/ws1/specs/a.yaml' },
        { uid: 'b', pathname: '/ws2/specs/b.yaml' }
      ]
    });

    expect(result.current.map((spec) => spec.uid)).toEqual(['a']);
  });

  it('returns an empty list when there is no active workspace', () => {
    const { result } = renderWithState({
      activeWorkspaceUid: null,
      workspaces: [],
      apiSpecs: [{ uid: 'a', pathname: '/ws1/specs/a.yaml' }]
    });

    expect(result.current).toEqual([]);
  });

  it('keeps the same list across renders while the store is unchanged', () => {
    const { result, rerender } = renderWithState({
      activeWorkspaceUid: 'ws-1',
      workspaces: [{ uid: 'ws-1', apiSpecs: [{ path: '/ws1/specs/a.yaml' }] }],
      apiSpecs: [{ uid: 'a', pathname: '/ws1/specs/a.yaml' }]
    });
    const firstResult = result.current;

    rerender();

    expect(result.current).toBe(firstResult);
  });
});
