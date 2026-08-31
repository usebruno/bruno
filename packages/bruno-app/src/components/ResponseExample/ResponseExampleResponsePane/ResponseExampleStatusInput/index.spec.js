/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch
}));

jest.mock('providers/ReduxStore/slices/collections', () => ({
  updateResponseExampleStatusCode: (payload) => ({ type: 'updateResponseExampleStatusCode', payload }),
  updateResponseExampleStatusText: (payload) => ({ type: 'updateResponseExampleStatusText', payload })
}));

jest.mock('./StyledWrapper', () => {
  return function MockStyledWrapper({ children, className }) {
    return <div className={className}>{children}</div>;
  };
});

import ResponseExampleStatusInput from './index';

const item = { uid: 'item-1' };
const collection = { uid: 'col-1' };

const renderStatusInput = (props = {}) => {
  const store = configureStore({
    reducer: {
      collections: (state = {}) => state
    }
  });

  return render(
    <Provider store={store}>
      <ThemeProvider theme={{}}>
        <ResponseExampleStatusInput
          item={item}
          collection={collection}
          exampleUid="ex-1"
          status={200}
          statusText="OK"
          {...props}
        />
      </ThemeProvider>
    </Provider>
  );
};

describe('ResponseExampleStatusInput', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('renders a native select with the current status selected', () => {
    renderStatusInput({ status: 404, statusText: 'Not Found' });

    const select = screen.getByTestId('response-status-input');
    expect(select.tagName).toBe('SELECT');
    expect(select).toHaveValue('404');
  });

  it('shows a placeholder when status is empty instead of inventing 200', () => {
    renderStatusInput({ status: '', statusText: '' });

    const select = screen.getByTestId('response-status-input');
    expect(select).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Select status' })).toBeInTheDocument();
  });

  it('keeps a custom statusText label for a known status code', () => {
    renderStatusInput({ status: 200, statusText: 'All Good' });

    expect(screen.getByRole('option', { name: '200 All Good' })).toBeInTheDocument();
  });

  it('includes a custom status option when the current code is unknown', () => {
    renderStatusInput({ status: 999, statusText: 'Custom Error' });

    const select = screen.getByTestId('response-status-input');
    expect(select).toHaveValue('999');
    expect(screen.getByRole('option', { name: '999 Custom Error' })).toBeInTheDocument();
  });

  it('dispatches status code and text when a known option is selected', () => {
    renderStatusInput({ status: 200, statusText: 'OK' });

    fireEvent.change(screen.getByTestId('response-status-input'), { target: { value: '404' } });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'updateResponseExampleStatusCode',
      payload: {
        itemUid: 'item-1',
        collectionUid: 'col-1',
        exampleUid: 'ex-1',
        statusCode: '404'
      }
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'updateResponseExampleStatusText',
      payload: {
        itemUid: 'item-1',
        collectionUid: 'col-1',
        exampleUid: 'ex-1',
        statusText: 'Not Found'
      }
    });
  });
});
