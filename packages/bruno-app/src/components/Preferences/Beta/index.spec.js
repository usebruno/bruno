import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider } from 'providers/Theme';
import { closeMockServerTabs } from 'providers/ReduxStore/slices/mock-server/actions';
import Beta from './index';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/mock-server/actions', () => ({
  closeMockServerTabs: jest.fn(() => ({ type: 'test/closeMockServerTabs' }))
}));

const renderBeta = ({ mockServerEnabled }) => {
  useSelector.mockImplementation((selector) => selector({
    app: { preferences: { beta: { 'mock-server': mockServerEnabled } } }
  }));
  render(
    <ThemeProvider>
      <Beta />
    </ThemeProvider>
  );
};

const mockServerToggle = () => screen.getByTestId('mock-server-beta-toggle').querySelector('input[type="checkbox"]');

describe('Beta preferences: Mock Server toggle', () => {
  let mockDispatch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch = jest.fn(() => Promise.resolve());
    useDispatch.mockReturnValue(mockDispatch);
  });

  it('closes the mock server tabs when Mock Server is turned off', async () => {
    renderBeta({ mockServerEnabled: true });

    fireEvent.click(mockServerToggle());

    expect(mockDispatch).toHaveBeenCalledWith(closeMockServerTabs());
    await waitFor(() => expect(mockServerToggle()).not.toBeChecked());
  });

  it('leaves tabs alone when Mock Server is turned on', async () => {
    renderBeta({ mockServerEnabled: false });

    fireEvent.click(mockServerToggle());

    await waitFor(() => expect(mockServerToggle()).toBeChecked());
    expect(closeMockServerTabs).not.toHaveBeenCalled();
  });
});
