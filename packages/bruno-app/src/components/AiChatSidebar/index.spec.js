import '@testing-library/jest-dom';
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';

jest.mock('utils/ai/chat-store', () => ({
  newConversationId: () => 'conv-1',
  saveConversation: jest.fn().mockResolvedValue(undefined),
  listConversationsForPath: jest.fn().mockResolvedValue([]),
  loadConversation: jest.fn().mockResolvedValue(null),
  deleteConversation: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('utils/ai', () => ({
  getAiStatus: jest.fn().mockResolvedValue({
    availableModels: [{ id: 'gpt-mock', label: 'GPT Mock', provider: 'mock' }]
  }),
  buildAiVariablesPayload: jest.fn(() => []),
  buildAiRequestsPayload: jest.fn(() => [])
}));

jest.mock('components/AiChatSidebar/DiffView', () => () => null);
jest.mock('components/AiChatSidebar/AssistantCodeBlock', () => () => null);

// Button / MenuDropdown pull in `polished` color helpers that choke on our
// theme proxy — swap them for lightweight stubs.
jest.mock('ui/Button', () => (props) => {
  const React = require('react');
  return React.createElement('button', props, props.children);
});
jest.mock('ui/MenuDropdown', () => (props) => {
  const React = require('react');
  return React.createElement('div', null, props.children);
});

// jsdom doesn't implement scrollIntoView / scrollTo; the sidebar's auto-scroll
// effect calls them and would otherwise throw during render.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn();
}

import AiChatSidebar from './index';

const COLLECTION = {
  uid: 'col-1',
  name: 'Test Collection',
  pathname: '/tmp/collection',
  root: {},
  items: []
};

const buildStore = ({ isLoading = false, isOpen = true } = {}) => {
  const chatSlice = createSlice({
    name: 'chat',
    initialState: {
      isOpen,
      isPoppedOut: false,
      chats: {
        'tab-1': {
          conversationId: null,
          pathname: '/tmp/collection',
          collectionUid: 'col-1',
          contentType: 'app',
          messages: [],
          isLoading,
          error: null,
          currentRequestId: null,
          createdAt: null,
          historyList: []
        }
      }
    },
    reducers: {
      setAiLoading: (state, action) => {
        const { tabUid, isLoading } = action.payload;
        if (state.chats[tabUid]) state.chats[tabUid].isLoading = isLoading;
      }
    }
  });

  const tabsSlice = createSlice({
    name: 'tabs',
    initialState: {
      tabs: [{ uid: 'tab-1', collectionUid: 'col-1', pathname: '/tmp/collection', requestPaneTab: 'script', scriptPaneTab: 'pre-request' }],
      activeTabUid: 'tab-1'
    },
    reducers: {}
  });

  const appSlice = createSlice({
    name: 'app',
    initialState: { preferences: { ai: { enabled: true } } },
    reducers: {}
  });

  const store = configureStore({
    reducer: {
      chat: chatSlice.reducer,
      tabs: tabsSlice.reducer,
      app: appSlice.reducer
    },
    // The real store dispatches unrelated thunks/actions during mount
    // (setChatBinding, refreshChatHistory, ...). The mock reducers don't
    // handle them, and immutable/serializable checks would flag payloads
    // we don't care about here — turn them off for this focused test.
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false
    })
  });

  return { store, setAiLoading: chatSlice.actions.setAiLoading };
};

// StyledWrapper reads many nested theme paths (`theme.border.radius.base`,
// `theme.button2.color.primary.bg`, `theme.request.methods.get`, ...). A
// recursive proxy returns a benign stub for every level so styled-components
// can generate CSS without us hand-listing every leaf.
// Every leaf is coerced by styled-components to a string via
// `Symbol.toPrimitive`; polished/color helpers then parse those strings, so
// we return a valid hex to keep them happy.
const makeThemeProxy = () =>
  new Proxy({}, {
    get: (_target, prop) => {
      if (prop === Symbol.toPrimitive || prop === 'toString') return () => '#000000';
      if (typeof prop === 'symbol') return undefined;
      return makeThemeProxy();
    }
  });
const theme = makeThemeProxy();

const renderSidebar = (options) => {
  const { store, setAiLoading } = buildStore(options);
  const utils = render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <AiChatSidebar collection={COLLECTION} />
      </ThemeProvider>
    </Provider>
  );
  return { ...utils, store, setAiLoading };
};

describe('AiChatSidebar prompt-input focus', () => {
  it('refocuses the prompt input when isLoading transitions from true to false', async () => {
    const { container, store, setAiLoading } = renderSidebar({ isLoading: true, isOpen: true });

    // The textarea is gated on getAiStatus() populating availableModels.
    const textarea = await waitFor(() => {
      const el = container.querySelector('.ai-sidebar-input textarea');
      if (!el) throw new Error('textarea not rendered yet');
      return el;
    });

    textarea.blur();
    expect(document.activeElement).not.toBe(textarea);

    await act(async () => {
      store.dispatch(setAiLoading({ tabUid: 'tab-1', isLoading: false }));
    });

    expect(document.activeElement).toBe(textarea);
  });

  it('does not steal focus when isLoading changes while the sidebar is closed', async () => {
    const { container, store, setAiLoading } = renderSidebar({ isLoading: true, isOpen: false });

    const textarea = container.querySelector('.ai-sidebar-input textarea');
    // With isOpen=false the sidebar body doesn't render its input.
    expect(textarea).toBeNull();

    await act(async () => {
      store.dispatch(setAiLoading({ tabUid: 'tab-1', isLoading: false }));
    });

    // Nothing to focus — assertion is that dispatch didn't blow up and no
    // element was force-focused elsewhere.
    expect(document.activeElement).toBe(document.body);
  });
});
