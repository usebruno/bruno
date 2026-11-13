import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import { clearPersistedScope, PersistedScopeProvider } from 'hooks/usePersistedState';
import toast from 'react-hot-toast';
import { DEFAULT_SSE_OPTIONS, getSseStorageKey } from 'utils/response/sse';
import SseResponse from './index';

jest.mock('providers/ReduxStore/slices/collections', () => ({
  appSetRuntimeVariable: (payload) => ({ type: 'save-variable', payload })
}));
jest.mock('../WsResponsePane/WSMessagesList', () => ({ messages }) => <div data-testid="raw-messages">{messages.map((m) => m.message).join('')}</div>);
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn() } }));

const theme = {
  bg: '#fff', text: '#222', border: { border1: '#ccc' },
  colors: { text: { muted: '#666', danger: '#f00' } },
  tabs: { active: { color: '#111', border: '#111' } }
};
const collection = { uid: 'collection', pathname: '/collections/demo' };
const message = (text) => ({ type: 'incoming', message: text });
const event = (data) => `data: ${JSON.stringify(data)}\n\n`;
const item = (data, running = true, pathname = '/collections/demo/chat.bru') => ({
  uid: 'request', pathname, response: { stream: { running }, data }
});
const renderResponse = (request, saved = {}) => {
  const store = configureStore({ reducer: (state = { saved }, action) => {
    if (action.type === 'save-variable') return { saved: { ...state.saved, [action.payload.key]: action.payload.value } };
    return state;
  } });
  const view = (value) => <Provider store={store}><ThemeProvider theme={theme}><PersistedScopeProvider scope="request"><SseResponse item={value} collection={collection} /></PersistedScopeProvider></ThemeProvider></Provider>;
  const rendered = render(view(request));
  return { ...rendered, store, update: (value) => rendered.rerender(view(value)) };
};

beforeEach(() => localStorage.clear());

it('updates incrementally, waits for complete events and keeps raw messages accessible', () => {
  const first = message(event({ choices: [{ delta: { content: '你好' } }] }));
  const second = message('data: {"choices":[{"delta":{"content":"世界"}}]}\n');
  const view = renderResponse(item([first]));
  expect(screen.getByTestId('sse-variable-content')).toHaveTextContent('你好');
  view.update(item([first, second]));
  expect(screen.getByTestId('sse-variable-content')).toHaveTextContent('你好');
  view.update(item([first, second, message('\n')]));
  expect(screen.getByTestId('sse-variable-content')).toHaveTextContent('你好世界');
  fireEvent.click(screen.getByRole('tab', { name: 'Events' }));
  expect(screen.getByTestId('raw-messages')).toHaveTextContent('choices');
  fireEvent.click(screen.getByRole('tab', { name: 'Merged' }));
  expect(screen.getByTestId('sse-variable-content')).toHaveTextContent('你好世界');
});

it('replays existing data and saves explicit changes to a completed response', () => {
  const messages = [message(event({ payload: { text: 'a' } }) + event({ payload: { text: 'b' } }))];
  const view = renderResponse(item(messages));
  fireEvent.change(screen.getByLabelText('SSE extraction mode'), { target: { value: 'custom' } });
  fireEvent.change(screen.getByLabelText('Variable name 1'), { target: { value: 'answer' } });
  fireEvent.change(screen.getByLabelText('JSONPath 1'), { target: { value: '$.payload.text' } });
  expect(screen.getByTestId('sse-variable-answer')).toHaveTextContent('ab');
  fireEvent.click(screen.getByLabelText('Save as runtime variables when the stream ends'));
  expect(view.store.getState().saved).toEqual({});
  view.update(item(messages, false));
  expect(view.store.getState().saved).toEqual({});
  fireEvent.change(screen.getByLabelText('Merge mode 1'), { target: { value: 'latest' } });
  expect(screen.getByTestId('sse-variable-answer')).toHaveTextContent('b');
  expect(view.store.getState().saved).toEqual({ answer: 'b' });
});

it('does not overwrite newer runtime variables when an old completed response is opened', () => {
  const request = item([message(event({ answer: 'old result' }))], false);
  localStorage.setItem(getSseStorageKey(request, collection), JSON.stringify({
    ...DEFAULT_SSE_OPTIONS, mode: 'custom', saveVariables: true,
    rules: [{ name: 'answer', path: '$.answer', merge: 'append' }]
  }));
  const view = renderResponse(request, { answer: 'newer result' });
  expect(screen.getByTestId('sse-variable-answer')).toHaveTextContent('old result');
  expect(view.store.getState().saved).toEqual({ answer: 'newer result' });
});

it('copies the merged text and confirms success after the clipboard write', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  renderResponse(item([message(event('你好') + event('世界'))]));
  fireEvent.click(screen.getByTestId('sse-copy-content'));
  await waitFor(() => expect(screen.getByTestId('sse-copy-content')).toHaveTextContent('Copied'));
  expect(writeText).toHaveBeenCalledWith('你好世界');
});

it('reports a clipboard failure without showing a copied confirmation', async () => {
  const writeText = jest.fn().mockRejectedValue(new Error('Clipboard unavailable'));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  renderResponse(item([message(event('hello'))]));
  fireEvent.click(screen.getByTestId('sse-copy-content'));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to copy variable'));
  expect(screen.getByTestId('sse-copy-content')).toHaveTextContent('Copy');
});

it('resets accumulated content on resend and retains it after cancellation', () => {
  const view = renderResponse(item([message(event('old'))]));
  view.update(item([message(event('new'))]));
  expect(screen.getByTestId('sse-variable-content')).toHaveTextContent('new');
  view.update(item([{ type: 'info', message: 'Connection Closed' }, message(event('new'))], false));
  expect(screen.getByTestId('sse-variable-content')).toHaveTextContent('new');
});

it('persists extraction settings across remounts and isolates requests by path', () => {
  const request = item([message(event({ x: 'saved' }))]);
  const first = renderResponse(request);
  fireEvent.change(screen.getByLabelText('SSE extraction mode'), { target: { value: 'custom' } });
  fireEvent.change(screen.getByLabelText('JSONPath 1'), { target: { value: '$.x' } });
  first.unmount();
  clearPersistedScope('request');
  const second = renderResponse(request);
  expect(screen.getByLabelText('JSONPath 1')).toHaveValue('$.x');
  expect(screen.getByTestId('sse-variable-content')).toHaveTextContent('saved');
  second.unmount();
  renderResponse(item([], true, '/collections/demo/other.bru'));
  expect(screen.getByLabelText('SSE extraction mode')).toHaveValue('auto');
});

it('shows rule errors and prevents invalid rules from saving runtime variables', () => {
  const view = renderResponse(item([message(event({ x: 'value' }))], false));
  fireEvent.change(screen.getByLabelText('SSE extraction mode'), { target: { value: 'custom' } });
  fireEvent.change(screen.getByLabelText('JSONPath 1'), { target: { value: '$[' } });
  fireEvent.click(screen.getByLabelText('Save as runtime variables when the stream ends'));
  expect(screen.getByRole('alert')).toHaveTextContent('valid JSONPath');
  expect(view.store.getState().saved).toEqual({});
});
