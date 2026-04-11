import React, { useState } from 'react';
import classnames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import { startMockServer, stopMockServer, refreshMockRoutes, updateMockDelay } from 'providers/ReduxStore/slices/mock-server';
import { IconRefresh, IconCopy, IconCheck } from '@tabler/icons';
import toast from 'react-hot-toast';
import RouteTable from './RouteTable';
import RequestLog from './RequestLog';
import StyledWrapper from './StyledWrapper';

const MockServerDashboard = ({ collection }) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('routes');
  const [port, setPort] = useState(4000);
  const [delay, setDelay] = useState(0);
  const [copied, setCopied] = useState(false);

  const serverState = useSelector((state) => state.mockServer.servers[collection.uid]) || {
    status: 'stopped',
    port: null,
    routeCount: 0,
    exampleCount: 0,
    globalDelay: 0
  };
  const logs = useSelector((state) => state.mockServer.requestLogs[collection.uid]) || [];

  const isRunning = serverState.status === 'running';
  const isStarting = serverState.status === 'starting';
  const baseUrl = isRunning ? `http://localhost:${serverState.port}` : null;

  const handleStart = async () => {
    try {
      await dispatch(startMockServer({
        collectionUid: collection.uid,
        collectionPath: collection.pathname,
        port: Number(port),
        globalDelay: Number(delay)
      })).unwrap();
      toast.success(`Mock server started on port ${port}`);
    } catch (err) {
      toast.error(err.message || 'Failed to start mock server');
    }
  };

  const handleStop = async () => {
    try {
      await dispatch(stopMockServer({ collectionUid: collection.uid })).unwrap();
      toast.success('Mock server stopped');
    } catch (err) {
      toast.error(err.message || 'Failed to stop mock server');
    }
  };

  const handleRefresh = async () => {
    try {
      const result = await dispatch(refreshMockRoutes({ collectionUid: collection.uid })).unwrap();
      toast.success(`Routes refreshed: ${result.routeCount} routes, ${result.exampleCount} examples`);
    } catch (err) {
      toast.error(err.message || 'Failed to refresh routes');
    }
  };

  const handleDelayChange = (e) => {
    const newDelay = Number(e.target.value) || 0;
    setDelay(newDelay);
    if (isRunning) {
      dispatch(updateMockDelay({ collectionUid: collection.uid, delay: newDelay }));
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

  const statusDotClass = isRunning ? 'running' : isStarting ? 'starting' : serverState.status === 'error' ? 'error' : '';
  const statusLabel = isRunning ? `Running on port ${serverState.port}` : isStarting ? 'Starting...' : serverState.status === 'error' ? 'Error' : 'Stopped';

  const getTabClassname = (tabName) => {
    return classnames('tab select-none', {
      active: tabName === activeTab
    });
  };

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'routes':
        return <RouteTable collection={collection} />;
      case 'log':
        return <RequestLog collection={collection} />;
      default:
        return null;
    }
  };

  return (
    <StyledWrapper className="flex flex-col h-full relative px-4 py-4 overflow-hidden">
      {/* Server control bar */}
      <div className="server-bar">
        <div className="status-indicator">
          <div className={`status-dot ${statusDotClass}`} />
          <span className="status-text">{statusLabel}</span>
        </div>

        {isRunning && baseUrl && (
          <button className="copy-url-btn" onClick={handleCopyUrl} title="Copy mock server URL">
            {copied ? <IconCheck size={13} strokeWidth={2} /> : <IconCopy size={13} strokeWidth={1.5} />}
            <span className="url-text">{baseUrl}</span>
          </button>
        )}

        <div className="server-controls">
          <div className="control-group">
            <label>Port</label>
            <input
              type="number"
              value={isRunning ? serverState.port : port}
              onChange={(e) => setPort(e.target.value)}
              disabled={isRunning || isStarting}
              min={1}
              max={65535}
            />
          </div>

          <div className="control-group">
            <label>Delay (ms)</label>
            <input
              type="number"
              value={isRunning ? (serverState.globalDelay || 0) : delay}
              onChange={handleDelayChange}
              disabled={isStarting}
              min={0}
              step={100}
            />
          </div>

          {!isRunning ? (
            <button className="action-btn start-btn" onClick={handleStart} disabled={isStarting}>
              {isStarting ? 'Starting...' : 'Start Server'}
            </button>
          ) : (
            <>
              <button className="action-btn stop-btn" onClick={handleStop}>
                Stop Server
              </button>
              <button className="action-btn refresh-btn" onClick={handleRefresh} title="Refresh routes from collection">
                <IconRefresh size={14} strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>

        {isRunning && (
          <div className="server-stats">
            <span>{serverState.routeCount} routes</span>
            <span>{serverState.exampleCount} examples</span>
          </div>
        )}

        {serverState.error && (
          <div className="error-message">{serverState.error}</div>
        )}
      </div>

      {/* Tabs - same pattern as CollectionSettings */}
      <div className="flex flex-wrap items-center tabs" role="tablist">
        <div className={getTabClassname('routes')} role="tab" onClick={() => setActiveTab('routes')}>
          Routes
          {serverState.routeCount > 0 && <sup className="ml-1 font-medium">{serverState.routeCount}</sup>}
        </div>
        <div className={getTabClassname('log')} role="tab" onClick={() => setActiveTab('log')}>
          Request Log
          {logs.length > 0 && <sup className="ml-1 font-medium">{logs.length}</sup>}
        </div>
      </div>

      {/* Tab content */}
      <section className="mt-4 h-full overflow-auto">
        {getTabPanel(activeTab)}
      </section>
    </StyledWrapper>
  );
};

export default MockServerDashboard;
