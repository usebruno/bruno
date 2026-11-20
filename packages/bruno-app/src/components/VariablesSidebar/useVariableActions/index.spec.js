import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { renderHook } from '@testing-library/react';
import { updateVariableInScope } from 'providers/ReduxStore/slices/collections/actions';
import useVariableActions from './index';
import { SCOPES } from '../constants';

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  updateVariableInScope: jest.fn(() => () => Promise.resolve())
}));

const collection = { uid: 'col-1' };

const renderActions = () => {
  const store = configureStore({ reducer: { app: (state = {}) => state } });
  const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
  return renderHook(() => useVariableActions({ collection, item: null }), { wrapper }).result.current;
};

describe('useVariableActions', () => {
  beforeEach(() => updateVariableInScope.mockClear());

  it.each([
    [SCOPES.ENVIRONMENT, 'environment'],
    [SCOPES.GLOBAL, 'global']
  ])('saves an edited %s secret as a secret', (scope, type) => {
    const { saveValue } = renderActions();
    const section = { scope, owner: { uid: 'env-child' } };
    const row = { name: 'token', secret: true };

    saveValue(section, row, 'new-secret', 'string');

    expect(updateVariableInScope).toHaveBeenCalledWith(
      'token',
      'new-secret',
      expect.objectContaining({ type, data: expect.objectContaining({ secret: true }) }),
      'col-1'
    );
  });
});
