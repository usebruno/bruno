import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addInterceptedRequest,
  updateInterceptedRequest,
  selectProxyStatus,
  selectProxyPort,
  selectSelectedRequestId
} from 'providers/ReduxStore/slices/networkIntercept';
import { isElectron } from 'utils/common/platform';
import InterceptControls from './InterceptControls';
import NetworkLogs from './NetworkLogs';
import RequestDetail from './RequestDetail';
import StyledWrapper from './StyledWrapper';

const NetworkIntercept = ({ onCreateRequest }) => {
  const dispatch = useDispatch();
  const proxyStatus = useSelector(selectProxyStatus);
  const proxyPort = useSelector(selectProxyPort);
  const selectedRequestId = useSelector(selectSelectedRequestId);

  // Set up IPC listeners for intercepted requests
  useEffect(() => {
    if (!isElectron()) return;

    const { ipcRenderer } = window;

    // Listen for intercepted requests
    const removeRequestListener = ipcRenderer.on('network-intercept:request', (request) => {
      dispatch(addInterceptedRequest(request));
    });

    // Listen for responses
    const removeResponseListener = ipcRenderer.on('network-intercept:response', (data) => {
      dispatch(updateInterceptedRequest({
        id: data.request.id,
        response: data.response
      }));
    });

    // Listen for errors
    const removeErrorListener = ipcRenderer.on('network-intercept:error', (error) => {
      console.error('Network intercept error:', error);
    });

    return () => {
      removeRequestListener();
      removeResponseListener();
      removeErrorListener();
    };
  }, [dispatch]);

  const getStatusBadgeClass = () => {
    switch (proxyStatus) {
      case 'running':
        return 'running';
      case 'starting':
      case 'stopping':
        return 'starting';
      default:
        return 'stopped';
    }
  };

  const getStatusText = () => {
    switch (proxyStatus) {
      case 'running':
        return `Running on port ${proxyPort}`;
      case 'starting':
        return 'Starting...';
      case 'stopping':
        return 'Stopping...';
      default:
        return 'Stopped';
    }
  };

  return (
    <StyledWrapper>
      <div className="network-intercept-header">
        <div className="header-left">
          <span className="title">Network Intercept</span>
          <div className={`status-badge ${getStatusBadgeClass()}`}>
            <span className={`status-dot ${proxyStatus === 'running' ? 'pulse' : ''}`} />
            {getStatusText()}
          </div>
        </div>
        <div className="header-right">
          <InterceptControls />
        </div>
      </div>

      <div className="network-intercept-content">
        <div className={`network-logs-panel ${!selectedRequestId ? 'full-width' : ''}`}>
          <NetworkLogs />
        </div>

        {selectedRequestId && (
          <div className="request-detail-panel">
            <RequestDetail onCreateRequest={onCreateRequest} />
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default NetworkIntercept;
