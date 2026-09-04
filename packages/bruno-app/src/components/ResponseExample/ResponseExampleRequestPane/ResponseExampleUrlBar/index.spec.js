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
  updateResponseExampleRequest: (payload) => ({ type: 'updateResponseExampleRequest', payload }),
  updateResponseExampleRequestUrl: (payload) => ({ type: 'updateResponseExampleRequestUrl', payload })
}));

jest.mock('components/SingleLineEditor', () => {
  return function MockEditor({ value }) {
    return <input data-testid="response-example-url-input" value={value || ''} readOnly />;
  };
});

jest.mock('components/RequestPane/QueryUrl/HttpMethodSelector', () => {
  return function MockHttpMethodSelector({ method, onMethodSelect }) {
    return (
      <button type="button" data-testid="http-method-selector" onClick={() => onMethodSelect('POST')}>
        {method}
      </button>
    );
  };
});

jest.mock('./StyledWrapper', () => {
  return function MockStyledWrapper({ children, className }) {
    return <div className={className}>{children}</div>;
  };
});

import ResponseExampleUrlBar from './index';

const collection = { uid: 'col-1' };
const exampleUid = 'ex-1';

const item = {
  uid: 'item-1',
  draft: {
    examples: [{
      uid: exampleUid,
      request: {
        method: 'GET',
        url: '/users'
      }
    }]
  }
};

const renderUrlBar = (props = {}, itemOverride = item) => {
  const store = configureStore({
    reducer: {
      collections: (state = {}) => state
    }
  });

  return render(
    <Provider store={store}>
      <ThemeProvider theme={{}}>
        <ResponseExampleUrlBar
          item={itemOverride}
          collection={collection}
          exampleUid={exampleUid}
          editMode
          onSave={jest.fn()}
          {...props}
        />
      </ThemeProvider>
    </Provider>
  );
};

describe('ResponseExampleUrlBar', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('shows a method badge by default', () => {
    renderUrlBar();

    expect(screen.queryByTestId('response-example-method-selector')).not.toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('shows the method selector for editable mock responses', () => {
    renderUrlBar({ allowMethodSelect: true, editMode: true });

    expect(screen.getByTestId('response-example-method-selector')).toBeInTheDocument();
    expect(screen.getByTestId('http-method-selector')).toHaveTextContent('GET');
  });

  it('keeps the method selector style when allowMethodSelect is set but editMode is off', () => {
    renderUrlBar({ allowMethodSelect: true, editMode: false });

    const selector = screen.getByTestId('response-example-method-selector');
    expect(selector).toBeInTheDocument();
    expect(selector).toHaveClass('pointer-events-none');
    expect(selector).toHaveAttribute('inert');
    expect(screen.getByTestId('http-method-selector')).toHaveTextContent('GET');
  });

  it('preserves an empty method while custom method entry is in progress', () => {
    const emptyMethodItem = {
      uid: 'item-1',
      draft: {
        examples: [{
          uid: exampleUid,
          request: {
            method: '',
            url: '/users'
          }
        }]
      }
    };

    renderUrlBar({ allowMethodSelect: true, editMode: true }, emptyMethodItem);

    expect(screen.getByTestId('http-method-selector')).toHaveTextContent('');
  });

  it('dispatches updateResponseExampleRequest when a method is selected', () => {
    renderUrlBar({ allowMethodSelect: true, editMode: true });

    fireEvent.click(screen.getByTestId('http-method-selector'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'updateResponseExampleRequest',
      payload: {
        itemUid: 'item-1',
        collectionUid: 'col-1',
        exampleUid: 'ex-1',
        request: { method: 'POST' }
      }
    });
  });

  it('does not dispatch method changes when editMode is off', () => {
    renderUrlBar({ allowMethodSelect: true, editMode: false });

    fireEvent.click(screen.getByTestId('http-method-selector'));

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
