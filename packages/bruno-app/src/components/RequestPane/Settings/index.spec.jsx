import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeContext } from 'providers/Theme';
import Settings from './index';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch, useSelector: jest.fn() }));
jest.mock('providers/ReduxStore/slices/collections', () => ({
  updateItemSettings: (payload) => ({ type: 'update-settings', payload }), toggleAppMode: jest.fn()
}));
jest.mock('providers/ReduxStore/slices/tabs', () => ({ setTabAppPreview: jest.fn() }));
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({ saveRequest: jest.fn(), sendRequest: jest.fn() }));
jest.mock('./Tags/index', () => () => null);
jest.mock('components/SettingsInput', () => () => null);
jest.mock('components/InheritableSettingsInput', () => () => null);

const theme = { primary: { solid: '#f90' }, background: { surface2: '#ddd' } };
const renderSettings = (settings, draft) => render(
  <ThemeContext.Provider value={{ theme }}>
    <Settings item={{ uid: 'request', type: 'http-request', settings, draft }} collection={{ uid: 'collection' }} />
  </ThemeContext.Provider>
);

beforeEach(() => mockDispatch.mockClear());

it.each([undefined, {}, { useProxy: null }])('defaults to the app proxy for existing settings %j', (settings) => {
  renderSettings(settings);
  expect(screen.getByTestId('use-app-proxy-toggle')).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(screen.getByTestId('use-app-proxy-toggle'));
  expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ settings: expect.objectContaining({ useProxy: false }) }) }));
});

it('enables the app proxy for a saved direct request', () => {
  renderSettings({ useProxy: false });
  expect(screen.getByTestId('use-app-proxy-toggle')).toHaveAttribute('aria-checked', 'false');
  fireEvent.click(screen.getByTestId('use-app-proxy-toggle'));
  expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ settings: expect.objectContaining({ useProxy: true }) }) }));
});

it('shows an unsaved draft choice ahead of saved request settings', () => {
  renderSettings({ useProxy: true }, { settings: { useProxy: false } });
  expect(screen.getByTestId('use-app-proxy-toggle')).toHaveAttribute('aria-checked', 'false');
});
