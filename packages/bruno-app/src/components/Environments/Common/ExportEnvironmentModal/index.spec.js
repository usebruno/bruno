import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import ExportEnvironmentModal from './index';

jest.mock('components/Portal/index', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>
}));

jest.mock('components/Modal', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>
}));

const buildEnvironment = ({ uid, name, extendsFrom }) => ({
  uid,
  name,
  variables: [],
  extends: extendsFrom
});

const renderModal = (environments) => {
  const slice = createSlice({ name: 'collections', initialState: { collections: [] }, reducers: {} });
  const store = configureStore({ reducer: { collections: slice.reducer } });

  return render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <ExportEnvironmentModal onClose={jest.fn()} environments={environments} environmentType="collection" />
      </ThemeProvider>
    </Provider>
  );
};

const inheritanceWarningTexts = () =>
  screen.queryAllByTestId('env-export-inheritance-warning').map((warning) => warning.textContent);

describe('ExportEnvironmentModal', () => {
  it('does not warn when every inherited environment is selected', () => {
    renderModal([
      buildEnvironment({ uid: 'env-local', name: 'local' }),
      buildEnvironment({ uid: 'env-derived', name: 'derived', extendsFrom: 'local' })
    ]);

    expect(inheritanceWarningTexts()).toEqual([]);
  });

  it('warns about an inherited environment that is left out of the export', () => {
    renderModal([
      buildEnvironment({ uid: 'env-local', name: 'local' }),
      buildEnvironment({ uid: 'env-derived', name: 'derived', extendsFrom: 'local' })
    ]);

    fireEvent.click(screen.getByLabelText('local'));

    expect(inheritanceWarningTexts()).toEqual(['inherits local']);
  });

  it('warns about a referenced parent environment that no longer exists', () => {
    renderModal([buildEnvironment({ uid: 'env-derived', name: 'derived', extendsFrom: 'deleted-parent' })]);

    expect(inheritanceWarningTexts()).toEqual(['inherits deleted-parent']);
  });

  it('names the missing parent ahead of the left-out ancestors below it', () => {
    renderModal([
      buildEnvironment({ uid: 'env-middle', name: 'middle', extendsFrom: 'deleted-root' }),
      buildEnvironment({ uid: 'env-leaf', name: 'leaf', extendsFrom: 'middle' })
    ]);

    fireEvent.click(screen.getByLabelText('middle'));

    expect(inheritanceWarningTexts()).toEqual(['inherits deleted-root, middle']);
  });
});
