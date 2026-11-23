import '@testing-library/jest-dom';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import { fireEvent, render, screen } from '@testing-library/react';
import themes from 'themes/index';
import openapiSyncReducer from 'providers/ReduxStore/slices/openapi-sync';
import SyncReviewPage from './index';

const pets = { id: 'GET:/pets', method: 'GET', path: '/pets', name: 'List pets' };
const specDrift = { added: [], modified: [pets], removed: [], newSpec: { openapi: '3.0.0', paths: {} } };
const remoteDrift = { modified: [{ ...pets, conflictingFields: [] }], missing: [], localOnly: [], inSync: [] };
const collectionDriftWith = (edited) => ({ edited, modified: edited, missing: [], localOnly: [] });

const renderReview = (store, collectionDrift) => {
  const onApplySync = jest.fn();
  const utils = render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <SyncReviewPage
          specDrift={specDrift}
          remoteDrift={remoteDrift}
          collectionDrift={collectionDrift}
          collectionPath="/collections/pets"
          collectionUid="pets"
          newSpec={specDrift.newSpec}
          isSyncing={false}
          isLoading={false}
          onApplySync={onApplySync}
        />
      </ThemeProvider>
    </Provider>
  );
  return { ...utils, onApplySync };
};

describe('SyncReviewPage', () => {
  it('gives an endpoint the usual Update choice once it stops being a conflict', () => {
    const store = configureStore({ reducer: { openapiSync: openapiSyncReducer } });

    const conflict = renderReview(store, collectionDriftWith([pets]));
    expect(screen.getByTestId('openapi-sync-apply')).toBeDisabled();
    conflict.unmount();

    const { onApplySync } = renderReview(store, collectionDriftWith([]));
    expect(screen.getByTestId('openapi-sync-decision-accept')).toHaveClass('selected');

    fireEvent.click(screen.getByTestId('openapi-sync-apply'));
    fireEvent.click(screen.getByTestId('openapi-sync-confirm'));

    expect(onApplySync.mock.calls[0][0].specUpdates.map(({ id }) => id)).toEqual([pets.id]);
  });
});
