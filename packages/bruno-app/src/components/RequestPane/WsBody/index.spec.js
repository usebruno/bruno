import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock heavy sub-components so jsdom doesn't have to load CodeMirror/themes
jest.mock('./SingleWSMessage/index', () => ({
  SingleWSMessage: ({ message }) => <div data-testid="ws-message">{message.content}</div>
}));
jest.mock('./StyledWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('ui/Button', () => ({ children, onClick }) => (
  <button onClick={onClick}>{children}</button>
));
jest.mock('@tabler/icons', () => ({ IconPlus: () => null }));

import WSBody from './index';

const makeStore = () =>
  configureStore({
    reducer: { collections: (s = {}) => s }
  });

const makeItem = (ws) => ({
  uid: 'item-1',
  draft: null,
  request: {
    methodType: 'GET',
    body: { mode: 'ws', ws }
  }
});

const collection = { uid: 'col-1' };

const renderWSBody = (ws) =>
  render(
    <Provider store={makeStore()}>
      <WSBody item={makeItem(ws)} collection={collection} handleRun={() => {}} />
    </Provider>
  );

describe('WSBody', () => {
  describe('when body.ws is an empty array', () => {
    it('shows the Add Message button instead of a blank screen', () => {
      renderWSBody([]);
      expect(screen.getByText('Add Message')).toBeInTheDocument();
    });

    it('does NOT render any message editor', () => {
      renderWSBody([]);
      expect(screen.queryByTestId('ws-message')).not.toBeInTheDocument();
    });
  });

  describe('when body.ws is undefined', () => {
    it('shows the Add Message button', () => {
      renderWSBody(undefined);
      expect(screen.getByText('Add Message')).toBeInTheDocument();
    });
  });

  describe('when body.ws has one message', () => {
    it('renders the message editor', () => {
      renderWSBody([{ name: 'message 1', content: '{}', type: 'json' }]);
      expect(screen.getByTestId('ws-message')).toBeInTheDocument();
    });

    it('does NOT show the Add Message button', () => {
      renderWSBody([{ name: 'message 1', content: '{}', type: 'json' }]);
      expect(screen.queryByText('Add Message')).not.toBeInTheDocument();
    });
  });
});
