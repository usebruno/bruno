import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import TimelineItem from '../Timeline/TimelineItem';
import RunnerTimeline from './index';

jest.mock('../Timeline/TimelineItem', () => jest.fn(() => null));

const REQUEST = { method: 'GET', url: 'https://example.com', timestamp: 2000 };
const RESPONSE = { status: 200, size: 42 };

describe('RunnerTimeline', () => {
  beforeEach(() => TimelineItem.mockClear());

  it('gives only the main entry its request and response on the item', () => {
    const item = {
      uid: 'item-1',
      oauth2DebugEntries: [{ debugInfo: [{ request: { url: 'https://auth' }, response: { status: 200 } }] }]
    };

    render(
      <ThemeProvider theme={themes.light}>
        <RunnerTimeline request={REQUEST} response={RESPONSE} item={item} collection={{}} />
      </ThemeProvider>
    );

    const calls = TimelineItem.mock.calls.map(([props]) => props);
    const main = calls.find((props) => props.source === 'main');
    const oauth = calls.find((props) => props.isOauth2);

    expect(main.item).toMatchObject({ uid: 'item-1', requestSent: REQUEST, response: RESPONSE });
    expect(oauth.item).toBe(item);
  });
});
