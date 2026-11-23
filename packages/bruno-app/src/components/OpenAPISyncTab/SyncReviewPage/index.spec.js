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

const renderReview = (store, { edited = [], conflictingFields = [] } = {}) => {
  const onApplySync = jest.fn();
  const utils = render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <SyncReviewPage
          specDrift={specDrift}
          remoteDrift={{ modified: [{ ...pets, conflictingFields }], missing: [], localOnly: [], inSync: [] }}
          collectionDrift={{ edited, modified: edited, missing: [], localOnly: [] }}
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

const createStore = () => configureStore({ reducer: { openapiSync: openapiSyncReducer } });

describe('SyncReviewPage', () => {
  it('gives an endpoint the usual Update choice once it stops being a conflict', () => {
    const store = createStore();

    const conflict = renderReview(store, { edited: [pets] });
    expect(screen.getByTestId('openapi-sync-apply')).toBeDisabled();
    conflict.unmount();

    const { onApplySync } = renderReview(store);
    expect(screen.getByTestId('openapi-sync-decision-accept')).toHaveClass('selected');

    fireEvent.click(screen.getByTestId('openapi-sync-apply'));
    fireEvent.click(screen.getByTestId('openapi-sync-confirm'));

    expect(onApplySync.mock.calls[0][0].specUpdates.map(({ id }) => id)).toEqual([pets.id]);
  });

  it('leaves a later conflict unresolved instead of keeping the default Update', () => {
    const store = createStore();

    const update = renderReview(store);
    expect(screen.getByTestId('openapi-sync-decision-accept')).toHaveClass('selected');
    update.unmount();

    renderReview(store, { conflictingFields: ['name'] });
    expect(screen.getByTestId('openapi-sync-decision-accept')).not.toHaveClass('selected');
    expect(screen.getByTestId('openapi-sync-apply')).toBeDisabled();
  });

  it('remembers a choice the user made when the page opens again', () => {
    const store = createStore();

    const first = renderReview(store);
    fireEvent.click(screen.getByTestId('openapi-sync-decision-keep'));
    first.unmount();

    renderReview(store);
    expect(screen.getByTestId('openapi-sync-decision-keep')).toHaveClass('selected');
  });
});
