import React, { useState, useMemo, useEffect } from 'react';
import classnames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import { startMockServer, stopMockServer, refreshMockRoutes, updateMockDelay, syncMockServerState } from 'providers/ReduxStore/slices/mock-server';
import { IconRefresh, IconCopy, IconCheck, IconSettings } from '@tabler/icons';
import toast from 'react-hot-toast';
import get from 'lodash/get';
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
} from 'utils/mock-server-instances';
import MockResponsesList from 'components/MockResponse/MockResponsesList';
import { resolveMockResponseCollection, resolveMockResponseLocation } from 'utils/mock-responses';
import StyledWrapper from './StyledWrapper';

const MockServerDashboard = ({ instance, collection }) => {
  const dispatch = useDispatch();
  const mockServerUid = instance.uid;
  const [activeTab, setActiveTab] = useState('responses');
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(instance.name);
  const [portDraft, setPortDraft] = useState(String(instance.port ?? ''));
  const [delayDraft, setDelayDraft] = useState(instance.globalDelay || 0);
  const [portError, setPortError] = useState(null);
  const [showAdvancedPort, setShowAdvancedPort] = useState(false);

  const preferences = useSelector((state) => state.app.preferences);
  const collections = useSelector((state) => state.collections.collections);
  const mockMode = useSelector((state) => get(state.app.preferences, 'mockServer.mode', 'isolated'));
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
  const logs = useSelector((state) => state.mockServer.requestLogs[mockServerUid]) || [];

  const isRunning = serverState.status === 'running';
  const isStarting = serverState.status === 'starting';
  const isStopping = serverState.status === 'stopping';
  const isSharedMode = mockMode === 'shared';
  const baseUrl = isRunning ? serverState.baseUrl : null;
  const activePort = isRunning ? serverState.port : storedInstance.port;
  const activeDelay = isRunning ? (serverState.globalDelay || 0) : (storedInstance.globalDelay || 0);

  useEffect(() => {
    setNameDraft(storedInstance.name);
    setPortDraft(String(activePort ?? ''));
    setDelayDraft(activeDelay);
  }, [storedInstance.name, activePort, activeDelay]);

  const validatePortDraft = async (value = portDraft) => {
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

  useEffect(() => {
    if (!isRunning || activeTab !== 'log') {
      return undefined;
    }

    const intervalId = setInterval(() => {
      dispatch(syncMockServerState(location));
    }, 2000);

    return () => clearInterval(intervalId);
  }, [activeTab, dispatch, isRunning, mockServerUid]);

  const resolveStartPayload = () => resolveMockServerStartPayload(storedInstance, {
    collection,
    apiSpecs,
    workspacePath: resolveMockServerWorkspacePath(storedInstance, workspaces, activeWorkspace)
  });

  const handleStart = async () => {
    if (!isSharedMode) {
      const isValidPort = await validatePortDraft();
      if (!isValidPort) {
        toast.error(portError || 'Fix the port before starting the mock server');
        return;
      }

      const nextPort = Number(String(portDraft).trim());
      if (nextPort !== Number(storedInstance.port)) {
        try {
          await persistInstance({ port: nextPort });
        } catch {
          toast.error('Failed to save mock server port');
          return;
        }
      }
    }

    try {
      const payload = resolveStartPayload();
      const result = await dispatch(startMockServer(payload)).unwrap();
      await dispatch(syncMockServerState(location));

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

  const handlePortBlur = async () => {
    const trimmed = String(portDraft).trim();

    if (!trimmed) {
      setPortDraft(String(storedInstance.port));
      setPortError(null);
      return;
    }

    const nextPort = Number(trimmed);
    if (nextPort === Number(storedInstance.port)) {
      setPortError(null);
      return;
    }

    const isValidPort = await validatePortDraft(trimmed);
    if (!isValidPort) {
      return;
    }

    try {
      await persistInstance({ port: nextPort });
      setPortError(null);
    } catch {
      toast.error('Failed to save mock server port');
      setPortDraft(String(storedInstance.port));
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

        {isRunning && storedInstance.port && serverState.port && Number(storedInstance.port) !== Number(serverState.port) && (
          <div className="text-xs text-amber-600 mt-1" data-testid="mock-server-port-mismatch">
            Configured port {storedInstance.port} differs from the running port {serverState.port}.
          </div>
        )}

        {isRunning && isSharedMode && (
          <div className="text-xs opacity-70 mt-1" data-testid="mock-server-shared-url-hint">
            Shared mode: append route paths to the base URL, e.g. {baseUrl}/products
          </div>
        )}

        <div className="server-controls">
          <div className="control-group control-group-advanced">
            <button
              type="button"
              className="advanced-toggle"
              onClick={() => setShowAdvancedPort((value) => !value)}
              data-testid="mock-server-advanced-settings-toggle"
            >
              {showAdvancedPort ? 'Hide advanced settings' : 'Advanced settings'}
            </button>
            {showAdvancedPort ? (
              <div className="advanced-port-field">
                {!isSharedMode ? (
                  <>
                    <label htmlFor="mock-server-port-input">Port</label>
                    <input
                      id="mock-server-port-input"
                      type="number"
                      value={portDraft}
                      onChange={(event) => {
                        setPortDraft(event.target.value);
                        if (portError) {
                          setPortError(null);
                        }
                      }}
                      onBlur={handlePortBlur}
                      disabled={isRunning || isStarting || isStopping}
                      min={1}
                      max={65535}
                      data-testid="mock-server-port-input"
                    />
                    {portError ? (
                      <div className="field-error" data-testid="mock-server-port-error">{portError}</div>
                    ) : null}
                  </>
                ) : null}
                <label htmlFor="mock-server-delay-input">Response delay (ms)</label>
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
            ) : null}
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
