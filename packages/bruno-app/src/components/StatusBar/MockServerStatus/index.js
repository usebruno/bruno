import { useDispatch, useSelector } from 'react-redux';
import find from 'lodash/find';
import { IconServer } from '@tabler/icons';
import { useBetaFeature, BETA_FEATURES } from 'utils/beta-features';
import { uuid } from 'utils/common';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import ToolHint from 'components/ToolHint';
import MenuDropdown from 'ui/MenuDropdown';

const MockServerStatusDot = () => <span className="mock-server-status-dot" />;

const MockServerStatus = () => {
  const dispatch = useDispatch();
  const isMockServerEnabled = useBetaFeature(BETA_FEATURES.MOCK_SERVER);
  const mockServers = useSelector((state) => state.mockServer?.servers || {});
  const collections = useSelector((state) => state.collections.collections);
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const activeTab = find(tabs, (t) => t.uid === activeTabUid);
  const activeCollectionUid = activeTab?.collectionUid;

  if (!isMockServerEnabled) {
    return null;
  }

  const getCollectionName = (collectionUid) => {
    const collection = find(collections, (c) => c.uid === collectionUid);
    return collection?.name || 'Collection';
  };

  const runningMockServers = Object.entries(mockServers)
    .filter(([_, server]) => server.status === 'running')
    .map(([collectionUid, server]) => ({
      collectionUid,
      port: server.port,
      collectionName: getCollectionName(collectionUid)
    }))
    .sort((a, b) => {
      if (a.collectionUid === activeCollectionUid) {
        return -1;
      }
      if (b.collectionUid === activeCollectionUid) {
        return 1;
      }
      return a.collectionName.localeCompare(b.collectionName);
    });

  if (!runningMockServers.length) {
    return null;
  }

  const handleMockServerClick = (collectionUid) => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid,
        type: 'mock-server-dashboard'
      })
    );
  };

  const buildMenuItems = (servers) => servers.map((server) => ({
    id: server.collectionUid,
    leftSection: MockServerStatusDot,
    label: `${server.collectionName} :${server.port}`,
    onClick: () => handleMockServerClick(server.collectionUid)
  }));

  const renderInlineButton = (server, tooltip) => (
    <ToolHint
      text={tooltip}
      toolhintId={`MockServer-${server.collectionUid}`}
      place="top"
      offset={10}
    >
      <button
        className="status-bar-button"
        onClick={() => handleMockServerClick(server.collectionUid)}
        tabIndex={0}
        aria-label={`${server.collectionName} mock server on port ${server.port}`}
        data-testid={`mock-server-statusbar-btn-${server.port}`}
      >
        <div className="console-button-content">
          <MockServerStatusDot />
          <span className="console-label ml-1">Mock :{server.port}</span>
        </div>
      </button>
    </ToolHint>
  );

  const activeRunningServer = runningMockServers.find((server) => server.collectionUid === activeCollectionUid);
  const overflowServers = activeRunningServer
    ? runningMockServers.filter((server) => server.collectionUid !== activeCollectionUid)
    : runningMockServers;

  if (runningMockServers.length === 1) {
    const server = runningMockServers[0];
    return renderInlineButton(server, `Mock Server running on port ${server.port}`);
  }

  if (activeRunningServer) {
    const tooltip = overflowServers.length
      ? `${activeRunningServer.collectionName} mock server on port ${activeRunningServer.port}`
      : `Mock Server running on port ${activeRunningServer.port}`;

    return (
      <div className="mock-server-status-group">
        {renderInlineButton(activeRunningServer, tooltip)}
        {overflowServers.length > 0 && (
          <MenuDropdown
            items={buildMenuItems(overflowServers)}
            placement="top-start"
            selectedItemId={activeCollectionUid}
            showTickMark={false}
            data-testid="mock-server-statusbar-overflow"
          >
            <button
              className="status-bar-button mock-server-overflow-btn"
              tabIndex={0}
              aria-label={`${overflowServers.length} more mock servers running`}
              data-testid="mock-server-statusbar-overflow-trigger"
            >
              <span className="console-label">+{overflowServers.length}</span>
            </button>
          </MenuDropdown>
        )}
      </div>
    );
  }

  return (
    <MenuDropdown
      items={buildMenuItems(runningMockServers)}
      placement="top-start"
      selectedItemId={activeCollectionUid}
      showTickMark={false}
      data-testid="mock-server-statusbar-overflow"
    >
      <button
        className="status-bar-button"
        tabIndex={0}
        aria-label={`${runningMockServers.length} mock servers running`}
        data-testid="mock-server-statusbar-summary"
      >
        <div className="console-button-content">
          <IconServer size={14} strokeWidth={1.5} aria-hidden="true" />
          <MockServerStatusDot />
          <span className="console-label ml-1">Mock ({runningMockServers.length})</span>
        </div>
      </button>
    </MenuDropdown>
  );
};

export default MockServerStatus;
