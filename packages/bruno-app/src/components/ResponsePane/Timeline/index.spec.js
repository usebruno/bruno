import React from 'react';
import { render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'providers/Theme';
import Timeline from './index';

jest.mock('./TimelineItem/index', () => {
  const React = jest.requireActual('react');
  return ({ request }) => React.createElement('div', { 'data-testid': 'timeline-rendered-url' }, request?.url);
});
jest.mock('./GrpcTimelineItem/index', () => () => null);

describe('Timeline request event references', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('resolves normalized request events for the response timeline', () => {
    const requestEvent = {
      type: 'request',
      collectionUid: 'collection-1',
      itemUid: 'request-1',
      timestamp: 1000,
      data: {
        request: { method: 'GET', url: 'https://example.com/users' },
        response: { statusCode: 200, duration: 10 }
      }
    };
    const collection = {
      uid: 'collection-1',
      timeline: [{
        type: 'request',
        requestEventId: 'event-1',
        collectionUid: 'collection-1',
        itemUid: 'request-1',
        timestamp: 1000
      }]
    };
    const item = {
      uid: 'request-1',
      type: 'http-request',
      request: { method: 'GET', url: 'https://example.com/users' }
    };
    const store = configureStore({
      reducer: (state = { collections: { requestTimelineEvents: { 'event-1': requestEvent } } }) => state
    });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <Timeline collection={collection} item={item} />
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByTestId('timeline-rendered-url')).toHaveTextContent('https://example.com/users');
  });
});
