import React, { useState, useMemo, useEffect } from 'react';
import classnames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import { startMockServer, stopMockServer, refreshMockRoutes, updateMockDelay, syncMockServerState } from 'providers/ReduxStore/slices/mock-server/index';
import { IconRefresh, IconCopy, IconCheck, IconSettings } from '@tabler/icons';
import toast from 'react-hot-toast';
import { validateName, validateNameError } from 'utils/common/regex';
import RouteTable from './RouteTable';
import RequestLog from './RequestLog';
import CreateMockServerModal from 'components/MockServer/CreateMockServerModal';
import DeleteMockServerModal from 'components/MockServer/DeleteMockServerModal';
import {
  findMockServerInstance,
  getMockServerInstances,
  checkMockServerPortAvailable,
  getMockServerPortError,
  isMockServerNameTaken,
  resolveInstanceSpec,
  saveMockServerInstance,
  resolveMockServerStartPayload,
  resolveMockServerWorkspacePath,
  updateMockServerTabName
} from 'utils/mock-server/mock-server-instances';
import MockResponsesList from 'components/MockServer/MockResponse/MockResponsesList';
import { resolveMockResponseCollection, resolveMockResponseLocation } from 'utils/mock-server/mock-responses';
import StyledWrapper from './StyledWrapper';

const MockServerLogCount = ({ mockServerUid }) => {
  const logCount = useSelector((state) => (state.mockServer.requestLogs[mockServerUid] || []).length);

  if (!logCount) {
    return null;
  }

  return <sup className="ml-1 font-medium">{logCount}</sup>;
};

const MockServerDashboard = ({ instance, collection }) => {
  const dispatch = useDispatch();
  const mockServerUid = instance.uid;
  const [activeTab, setActiveTab] = useState('responses');
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(instance.name);
  const [delayDraft, setDelayDraft] = useState(instance.globalDelay || 0);
  const [portError, setPortError] = useState(null);
  const collections = useSelector((state) => state.collections.collections);
  const apiSpecs = useSelector((state) => state.apiSpec.apiSpecs);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const storedInstance = useSelector((state) => (
    findMockServerInstance(state, mockServerUid) || instance
  ));
  const workspaceInstances = useSelector((state) => getMockServerInstances(state, activeWorkspaceUid));

  const activeWorkspace = useMemo(() => (
    workspaces.find((workspace) => workspace.uid === activeWorkspaceUid) || null
  ), [workspaces, activeWorkspaceUid]);

  const resolvedCollection = useMemo(() => (
    resolveMockResponseCollection({
      collection,
      instance,
      collections,
      activeWorkspace
    })
  ), [collection, instance, collections, activeWorkspace]);

  const location = useMemo(() => (
    resolveMockResponseLocation(instance, resolvedCollection, collections, workspaces, activeWorkspace)
  ), [instance, resolvedCollection, collections, workspaces, activeWorkspace]);

  const serverState = useSelector((state) => state.mockServer.servers[mockServerUid]) || {
    status: 'stopped',
    port: null,
    baseUrl: null,
    routeCount: 0,
    exampleCount: 0,
    globalDelay: instance.globalDelay || 0
  };

  const isRunning = serverState.status === 'running';
  const isStarting = serverState.status === 'starting';
  const isStopping = serverState.status === 'stopping';
  const baseUrl = isRunning ? serverState.baseUrl : null;
  const activePort = isRunning ? serverState.port : storedInstance.port;
  const activeDelay = isRunning ? (serverState.globalDelay || 0) : (storedInstance.globalDelay || 0);

  useEffect(() => {
    setNameDraft(storedInstance.name);
    setDelayDraft(activeDelay);
  }, [storedInstance.name, activeDelay]);

  useEffect(() => {
    validatePort(activePort);
  }, [activePort]);

  const validatePort = async (value = activePort) => {
    const trimmed = String(value).trim();

    if (!trimmed) {
      setPortError('Port is required');
      return false;
    }

    const nextPort = Number(trimmed);
    if (nextPort < 1 || nextPort > 65535) {
      setPortError('Port must be between 1 and 65535');
      return false;
    }

    try {
      const portCheck = await checkMockServerPortAvailable(nextPort, workspaceInstances, {
        excludeUid: storedInstance.uid
      });
      const error = getMockServerPortError(portCheck, nextPort);
      setPortError(error);
      return !error;
    } catch (err) {
      setPortError(err.message || 'Failed to validate port');
      return false;
    }
  };

  useEffect(() => {
    dispatch(syncMockServerState(location));
  }, [dispatch, location.mockServerUid, location.collectionPath, location.sourceType, location.workspacePath]);

  const resolveStartPayload = () => resolveMockServerStartPayload(storedInstance, {
    collection,
    apiSpecs,
    workspacePath: resolveMockServerWorkspacePath(storedInstance, workspaces, activeWorkspace)
  });

  const handleStart = async () => {
    const isValidPort = await validatePort(activePort);
    if (!isValidPort) {
      toast.error(portError || 'Fix the port before starting the mock server');
      return;
    }

    try {
      const payload = resolveStartPayload();
      const result = await dispatch(startMockServer(payload)).unwrap();
      await dispatch(syncMockServerState(location));

      toast.success(`Mock server started at ${result.baseUrl}`);
    } catch (err) {
      toast.error(err.message || 'Failed to start mock server');
    }
  };

  const handleStop = async () => {
    try {
      await dispatch(stopMockServer({ mockServerUid })).unwrap();
      await dispatch(syncMockServerState(location));
      toast.success('Mock server stopped');
    } catch (err) {
      toast.error(err.message || 'Failed to stop mock server');
    }
  };

  const handleRefresh = async () => {
    try {
      const result = await dispatch(refreshMockRoutes(location)).unwrap();
      toast.success(`Routes refreshed: ${result.routeCount} routes, ${result.exampleCount} responses`);
    } catch (err) {
      toast.error(err.message || 'Failed to refresh routes');
    }
  };

  const persistInstance = async (updates) => {
    const nextInstance = {
      ...storedInstance,
      ...updates
    };

    await dispatch(saveMockServerInstance(nextInstance));

    if (updates.name !== undefined) {
      dispatch(updateMockServerTabName(nextInstance));
    }
  };

  const handleNameBlur = async () => {
    const trimmedName = nameDraft.trim();

    if (!trimmedName || trimmedName === storedInstance.name) {
      setNameDraft(storedInstance.name);
      return;
    }

    if (!validateName(trimmedName)) {
      toast.error(validateNameError(trimmedName));
      setNameDraft(storedInstance.name);
      return;
    }

    if (isMockServerNameTaken(workspaceInstances, trimmedName, storedInstance.uid)) {
      toast.error('A mock server with this name already exists');
      setNameDraft(storedInstance.name);
      return;
    }

    try {
      await persistInstance({ name: trimmedName });
    } catch {
      toast.error('Failed to save mock server name');
      setNameDraft(storedInstance.name);
    }
  };

  const handleDelayChange = (event) => {
    setDelayDraft(Number(event.target.value) || 0);
  };

  const handleDelayBlur = async () => {
    const newDelay = Number(delayDraft) || 0;

    if (newDelay === activeDelay) {
      return;
    }

    try {
      if (isRunning) {
        await dispatch(updateMockDelay({ mockServerUid, delay: newDelay })).unwrap();
      }

      await persistInstance({ globalDelay: newDelay });
    } catch (err) {
      toast.error(err.message || 'Failed to update delay');
      setDelayDraft(activeDelay);
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
    ? `Running on port ${serverState.port}`
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
      case 'responses':
        return <MockResponsesList instance={instance} collection={collection} />;
      case 'routes':
        return <RouteTable mockServerUid={mockServerUid} />;
      case 'log':
        return <RequestLog mockServerUid={mockServerUid} />;
      default:
        return null;
    }
  };

  const sourceLabel = useMemo(() => {
    if (instance.sourceType === 'manual') {
      return 'Standalone';
    }

    if (instance.sourceType === 'spec') {
      const spec = resolveInstanceSpec(instance, apiSpecs);
      if (spec?.pathname) {
        return spec.name || spec.filename || spec.pathname;
      }
      return instance.specName || 'API Spec';
    }

    return collection?.name || 'Collection';
  }, [apiSpecs, collection?.name, instance]);

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
        <div className="min-w-0 flex-1">
          <input
            type="text"
            className="mock-server-name-input"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
            data-testid="mock-server-title-input"
          />
          <div className="text-xs opacity-70 mt-1" data-testid="mock-server-source-label">
            Source: {sourceLabel}
          </div>
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

        {isRunning && storedInstance.port && serverState.port && Number(storedInstance.port) !== Number(serverState.port) && (
          <div className="text-xs text-amber-600 mt-1" data-testid="mock-server-port-mismatch">
            Configured port {storedInstance.port} differs from the running port {serverState.port}.
          </div>
        )}

        <div className="server-controls">
          <div className="control-group">
            <label htmlFor="mock-server-delay-input">Delay (ms)</label>
            <input
              id="mock-server-delay-input"
              type="number"
              value={delayDraft}
              onChange={handleDelayChange}
              onBlur={handleDelayBlur}
              disabled={isStarting}
              min={0}
              step={100}
              data-testid="mock-server-delay-input"
            />
          </div>

          {!isRunning && !isStopping ? (
            <button
              className="action-btn start-btn"
              onClick={handleStart}
              disabled={isStarting || Boolean(portError)}
              data-testid="mock-server-start-btn"
            >
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
            <span>{serverState.exampleCount} responses</span>
          </div>
        )}

        {serverState.error && (
          <div className="error-message" data-testid="mock-server-error">{serverState.error}</div>
        )}
      </div>

      <div className="flex flex-wrap items-center tabs" role="tablist">
        <div className={getTabClassname('responses')} role="tab" data-testid="mock-server-tab-responses" onClick={() => setActiveTab('responses')}>
          Responses
        </div>
        <div className={getTabClassname('routes')} role="tab" data-testid="mock-server-tab-routes" onClick={() => setActiveTab('routes')}>
          Routes
          {serverState.routeCount > 0 && <sup className="ml-1 font-medium">{serverState.routeCount}</sup>}
        </div>
        <div className={getTabClassname('log')} role="tab" data-testid="mock-server-tab-log" onClick={() => setActiveTab('log')}>
          Request Log
          <MockServerLogCount mockServerUid={mockServerUid} />
        </div>
      </div>

      <section className="mt-4 h-full overflow-auto">
        {getTabPanel(activeTab)}
      </section>
    </StyledWrapper>
  );
};

export default MockServerDashboard;
