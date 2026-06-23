import React, { useState, useMemo, useEffect } from 'react';
import classnames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import { startMockServer, stopMockServer, refreshMockRoutes, updateMockDelay, syncMockServerState } from 'providers/ReduxStore/slices/mock-server';
import { IconRefresh, IconCopy, IconCheck, IconSettings } from '@tabler/icons';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import RouteTable from './RouteTable';
import RequestLog from './RequestLog';
import CreateMockServerModal from 'components/MockServer/CreateMockServerModal';
import DeleteMockServerModal from 'components/MockServer/DeleteMockServerModal';
import { resolveInstanceSpec, saveMockServerInstance, resolveMockServerStartPayload } from 'utils/mock-server-instances';
import StyledWrapper from './StyledWrapper';

const MockServerDashboard = ({ instance, collection }) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('routes');
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const mockMode = useSelector((state) => get(state.app.preferences, 'mockServer.mode', 'isolated'));
  const apiSpecs = useSelector((state) => state.apiSpec.apiSpecs);
  const mockServerUid = instance.uid;

  const serverState = useSelector((state) => state.mockServer.servers[mockServerUid]) || {
    status: 'stopped',
    port: null,
    baseUrl: null,
    routeCount: 0,
    exampleCount: 0,
    globalDelay: instance.globalDelay || 0
  };
  const logs = useSelector((state) => state.mockServer.requestLogs[mockServerUid]) || [];

  const isRunning = serverState.status === 'running';
  const isStarting = serverState.status === 'starting';
  const isStopping = serverState.status === 'stopping';
  const isSharedMode = mockMode === 'shared';
  const baseUrl = isRunning ? serverState.baseUrl : null;
  const port = isRunning ? serverState.port : instance.port;
  const delay = isRunning ? (serverState.globalDelay || 0) : (instance.globalDelay || 0);

  useEffect(() => {
    dispatch(syncMockServerState({ mockServerUid }));
  }, [dispatch, mockServerUid]);

  useEffect(() => {
    if (!isRunning || activeTab !== 'log') {
      return undefined;
    }

    const intervalId = setInterval(() => {
      dispatch(syncMockServerState({ mockServerUid }));
    }, 2000);

    return () => clearInterval(intervalId);
  }, [activeTab, dispatch, isRunning, mockServerUid]);

  const resolveStartPayload = () => resolveMockServerStartPayload(instance, { collection, apiSpecs });

  const handleStart = async () => {
    try {
      const payload = resolveStartPayload();
      const result = await dispatch(startMockServer(payload)).unwrap();
      await dispatch(syncMockServerState({ mockServerUid }));

      if (result.port && result.port !== instance.port) {
        await dispatch(saveMockServerInstance({
          ...instance,
          port: result.port
        }));
        toast(`Port ${instance.port} was unavailable. Server started on port ${result.port}.`, { icon: '⚠️' });
      }

      const message = result.examplesGenerated
        ? `Mock server started at ${result.baseUrl}. Generated ${result.examplesGenerated} example(s).`
        : `Mock server started at ${result.baseUrl}`;
      toast.success(message);
    } catch (err) {
      toast.error(err.message || 'Failed to start mock server');
    }
  };

  const handleStop = async () => {
    try {
      await dispatch(stopMockServer({ mockServerUid })).unwrap();
      toast.success('Mock server stopped');
    } catch (err) {
      toast.error(err.message || 'Failed to stop mock server');
    }
  };

  const handleRefresh = async () => {
    try {
      const result = await dispatch(refreshMockRoutes({ mockServerUid })).unwrap();
      toast.success(`Routes refreshed: ${result.routeCount} routes, ${result.exampleCount} examples`);
    } catch (err) {
      toast.error(err.message || 'Failed to refresh routes');
    }
  };

  const handleDelayChange = (e) => {
    const newDelay = Number(e.target.value) || 0;
    if (isRunning) {
      dispatch(updateMockDelay({ mockServerUid, delay: newDelay }));
    }
  };

  const handleCopyUrl = async () => {
    if (!baseUrl) return;
    try {
      await navigator.clipboard.writeText(baseUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const statusDotClass = isRunning ? 'running' : isStarting ? 'starting' : isStopping ? 'stopping' : serverState.status === 'error' ? 'error' : '';
  const statusLabel = isRunning
    ? (isSharedMode ? `Running at ${serverState.baseUrl}` : `Running on port ${serverState.port}`)
    : isStarting
      ? 'Starting...'
      : isStopping
        ? 'Stopping...'
        : serverState.status === 'error'
          ? 'Error'
          : 'Stopped';

  const getTabClassname = (tabName) => {
    return classnames('tab select-none', {
      active: tabName === activeTab
    });
  };

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'routes':
        return <RouteTable mockServerUid={mockServerUid} />;
      case 'log':
        return <RequestLog mockServerUid={mockServerUid} />;
      default:
        return null;
    }
  };

  const sourceLabel = useMemo(() => {
    if (instance.sourceType === 'spec') {
      const spec = resolveInstanceSpec(instance, apiSpecs);
      if (spec?.pathname) {
        return spec.name || spec.filename || spec.pathname;
      }
      return instance.specName || 'API Spec';
    }

    return collection?.name || 'Collection';
  }, [apiSpecs, collection?.name, instance]);

  const sourcePath = useMemo(() => {
    if (instance.sourceType !== 'spec') {
      return collection?.pathname || null;
    }

    const spec = resolveInstanceSpec(instance, apiSpecs);
    return spec?.pathname || instance.specPath || null;
  }, [apiSpecs, collection?.pathname, instance]);

  return (
    <StyledWrapper className="flex flex-col h-full relative px-4 py-4 overflow-hidden" data-testid="mock-server-dashboard" data-mock-server-uid={mockServerUid}>
      {settingsOpen && (
        <CreateMockServerModal
          editingInstance={instance}
          onClose={() => setSettingsOpen(false)}
          onDelete={() => {
            setSettingsOpen(false);
            setDeleteOpen(true);
          }}
        />
      )}
      {deleteOpen && (
        <DeleteMockServerModal
          instance={instance}
          onClose={() => setDeleteOpen(false)}
        />
      )}

      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold" data-testid="mock-server-title">{instance.name}</h2>
          <div className="text-xs opacity-70 mt-1" data-testid="mock-server-source-label">
            Source: {sourceLabel}
            {!isSharedMode ? ` · Port ${port}` : ''}
          </div>
          {/* {sourcePath ? (
            <div className="text-xs opacity-60 mt-1 break-all" data-testid="mock-server-source-path">
              {sourcePath}
            </div>
          ) : null} */}
        </div>
        <button
          className="action-btn refresh-btn"
          onClick={() => setSettingsOpen(true)}
          title="Mock server settings"
          data-testid="mock-server-settings-btn"
        >
          <IconSettings size={14} strokeWidth={1.5} />
        </button>
      </div>

      <div className="server-bar" data-testid="mock-server-controls">
        <div className="status-indicator">
          <div className={`status-dot ${statusDotClass}`} data-testid="mock-server-status-dot" />
          <span className="status-text" data-testid="mock-server-status-text">{statusLabel}</span>
        </div>

        {isRunning && baseUrl && (
          <button className="copy-url-btn" onClick={handleCopyUrl} title="Copy mock server URL" data-testid="mock-server-copy-url">
            {copied ? <IconCheck size={13} strokeWidth={2} /> : <IconCopy size={13} strokeWidth={1.5} />}
            <span className="url-text">{baseUrl}</span>
          </button>
        )}

        {isRunning && instance.port && serverState.port && Number(instance.port) !== Number(serverState.port) && (
          <div className="text-xs text-amber-600 mt-1" data-testid="mock-server-port-mismatch">
            Configured port {instance.port} was unavailable. Requests must use port {serverState.port}.
          </div>
        )}

        {isRunning && isSharedMode && (
          <div className="text-xs opacity-70 mt-1" data-testid="mock-server-shared-url-hint">
            Shared mode: append route paths to the base URL, e.g. {baseUrl}/products
          </div>
        )}

        {isRunning && !isSharedMode && baseUrl && (
          <div className="text-xs opacity-70 mt-1" data-testid="mock-server-isolated-url-hint">
            Use the base URL shown above, e.g. {baseUrl}/products
          </div>
        )}

        <div className="server-controls">
          <div className="control-group">
            <label>Delay (ms)</label>
            <input
              type="number"
              value={delay}
              onChange={handleDelayChange}
              disabled={isStarting}
              min={0}
              step={100}
              data-testid="mock-server-delay-input"
            />
          </div>

          {!isRunning && !isStopping ? (
            <button className="action-btn start-btn" onClick={handleStart} disabled={isStarting} data-testid="mock-server-start-btn">
              {isStarting ? 'Starting...' : 'Start Server'}
            </button>
          ) : (
            <>
              <button className="action-btn stop-btn" onClick={handleStop} disabled={isStopping} data-testid="mock-server-stop-btn">
                {isStopping ? 'Stopping...' : 'Stop Server'}
              </button>
              {!isStopping && (
                <button className="action-btn refresh-btn" onClick={handleRefresh} title="Refresh routes" data-testid="mock-server-refresh-btn">
                  <IconRefresh size={14} strokeWidth={1.5} />
                </button>
              )}
            </>
          )}
        </div>

        {isRunning && (
          <div className="server-stats" data-testid="mock-server-stats">
            <span>{serverState.routeCount} routes</span>
            <span>{serverState.exampleCount} examples</span>
          </div>
        )}

        {serverState.error && (
          <div className="error-message" data-testid="mock-server-error">{serverState.error}</div>
        )}
      </div>

      <div className="flex flex-wrap items-center tabs" role="tablist">
        <div className={getTabClassname('routes')} role="tab" data-testid="mock-server-tab-routes" onClick={() => setActiveTab('routes')}>
          Routes
          {serverState.routeCount > 0 && <sup className="ml-1 font-medium">{serverState.routeCount}</sup>}
        </div>
        <div className={getTabClassname('log')} role="tab" data-testid="mock-server-tab-log" onClick={() => setActiveTab('log')}>
          Request Log
          {logs.length > 0 && <sup className="ml-1 font-medium">{logs.length}</sup>}
        </div>
      </div>

      <section className="mt-4 h-full overflow-auto">
        {getTabPanel(activeTab)}
      </section>
    </StyledWrapper>
  );
};

export default MockServerDashboard;
