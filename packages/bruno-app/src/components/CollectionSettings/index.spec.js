import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CollectionSettings from './index';
import { updateSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch
}));
jest.mock('providers/ReduxStore/slices/collections', () => ({
  updateSettingsSelectedTab: jest.fn((payload) => ({ type: 'TEST_SELECT_SETTINGS_TAB', payload }))
}));
jest.mock('./StyledWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('./ProxySettings', () => () => <div>Proxy settings</div>);
jest.mock('./ClientCertSettings', () => () => <div>Client certificate settings</div>);
jest.mock('./Headers', () => () => <div>Headers settings</div>);
jest.mock('./Auth', () => () => <div>Auth settings</div>);
jest.mock('./Script', () => () => <div>Script settings</div>);
jest.mock('./Tests', () => () => <div>Test settings</div>);
jest.mock('./Presets', () => () => <div>Preset settings</div>);
jest.mock('./Protobuf', () => () => <div>Protobuf settings</div>);
jest.mock('./OnExit', () => () => <div>On Exit settings</div>);
jest.mock('./Vars/index', () => () => <div>Variable settings</div>);
jest.mock('./Overview/index', () => () => <div>Overview settings</div>);
jest.mock('components/StatusDot', () => () => <span data-testid="status-dot" />);
jest.mock('components/SettingsAiAssist', () => () => null);
jest.mock('components/Documentation/DocsAction', () => () => null);
jest.mock('components/Documentation/useDocsEditingState', () => ({
  useDocsEditingState: () => ({ isEditing: false })
}));

const createCollection = (settingsSelectedTab = 'overview', cleanupEnabled = true) => ({
  uid: 'collection-1',
  settingsSelectedTab,
  root: {
    request: {
      headers: [],
      vars: { req: [], res: [] },
      auth: { mode: 'none' }
    }
  },
  brunoConfig: {
    onExit: { enabled: cleanupEnabled },
    protobuf: {},
    clientCertificates: { certs: [] }
  }
});

describe('CollectionSettings On Exit tab', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses native keyboard-accessible tab semantics and preserves its enabled indicator', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CollectionSettings collection={createCollection()} />);
    const tab = screen.getByRole('tab', { name: 'On Exit' });

    expect(tab.tagName).toBe('BUTTON');
    expect(tab).toHaveAttribute('aria-selected', 'false');
    expect(within(tab).getByTestId('status-dot')).toBeInTheDocument();

    tab.focus();
    await user.keyboard('{Enter}');
    expect(updateSettingsSelectedTab).toHaveBeenLastCalledWith({
      collectionUid: 'collection-1',
      tab: 'onExit'
    });
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'TEST_SELECT_SETTINGS_TAB' }));

    mockDispatch.mockClear();
    tab.focus();
    await user.keyboard(' ');
    expect(mockDispatch).toHaveBeenCalledTimes(1);

    rerender(<CollectionSettings collection={createCollection('onExit', false)} />);
    const selectedTab = screen.getByRole('tab', { name: 'On Exit' });
    expect(selectedTab).toHaveAttribute('aria-selected', 'true');
    expect(within(selectedTab).queryByTestId('status-dot')).not.toBeInTheDocument();
  });
});
