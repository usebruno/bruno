import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  IconX,
  IconFileText,
  IconArrowRight,
  IconNetwork
} from '@tabler/icons';
import { clearSelectedRequest } from 'providers/ReduxStore/slices/logs';
import QueryResult from 'components/ResponsePane/QueryResult';
import Network from 'components/ResponsePane/Timeline/TimelineItem/Network';
import StyledWrapper from './StyledWrapper';

const RequestTab = ({ request, response }) => {
  const formatHeaders = (headers) => {
    if (!headers) return [];
    if (Array.isArray(headers)) return headers;
    return Object.entries(headers).map(([key, value]) => ({ name: key, value }));
  };

  const formatBody = (body) => {
    if (!body) return 'No body';
    if (typeof body === 'string') return body;
    return JSON.stringify(body, null, 2);
  };

  return (
    <div className="tab-content">
      <div className="section">
        <h4>General</h4>
        <div className="info-grid">
          <div className="info-item">
            <span className="label">Request URL:</span>
            <span className="value">{request?.url || 'N/A'}</span>
          </div>
          <div className="info-item">
            <span className="label">Request Method:</span>
            <span className="value">{request?.method || 'GET'}</span>
          </div>
        </div>
      </div>

      <div className="section">
        <h4>Request Headers</h4>
        {formatHeaders(request?.headers).length > 0 ? (
          <div className="headers-table">
            <table>
              <thead>
                <tr>
                  <td>Name</td>
                  <td>Value</td>
                </tr>
              </thead>
              <tbody>
                {formatHeaders(request.headers).map((header, index) => (
                  <tr key={index}>
                    <td className="header-name">{header.name}</td>
                    <td className="header-value">{header.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No headers</div>
        )}
      </div>

      {request?.body && (
        <div className="section">
          <h4>Request Body</h4>
          <pre className="code-block">{formatBody(request.body)}</pre>
        </div>
      )}
    </div>
  );
};

const ResponseTab = ({ response, request, collection }) => {
  const formatHeaders = (headers) => {
    if (!headers) return [];
    if (Array.isArray(headers)) return headers;
    return Object.entries(headers).map(([key, value]) => ({ name: key, value }));
  };

  return (
    <div className="tab-content">
      <div className="section">
        <h4>Response Headers</h4>
        {formatHeaders(response?.headers).length > 0 ? (
          <div className="headers-table">
            <table>
              <thead>
                <tr>
                  <td>Name</td>
                  <td>Value</td>
                </tr>
              </thead>
              <tbody>
                {formatHeaders(response.headers).map((header, index) => (
                  <tr key={index}>
                    <td className="header-name">{header.name}</td>
                    <td className="header-value">{header.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No headers</div>
        )}
      </div>

      <div className="section">
        <h4>Response Body</h4>
        <div className="response-body-container">
          {response?.data || response?.dataBuffer ? (
            <QueryResult
              item={{ uid: 'terminal-request-details' }}
              collection={collection || { uid: 'terminal-collection' }}
              data={response.data}
              dataBuffer={response.dataBuffer}
              headers={response.headers}
              error={response.error}
              disableRunEventListener={true}
            />
          ) : (
            <div className="empty-state">No response data</div>
          )}
        </div>
      </div>
    </div>
  );
};

const NetworkTab = ({ response }) => {
  const timeline = response?.timeline || [];

  return (
    <div className="tab-content">
      <div className="section">
        <h4>Network Logs</h4>
        <div className="network-logs-container">
          {timeline.length > 0 ? (
            <Network logs={timeline} />
          ) : (
            <div className="empty-state">No network logs available</div>
          )}
        </div>
      </div>
    </div>
  );
};

const RequestDetailsPanel = () => {
  const dispatch = useDispatch();
  const { selectedRequest } = useSelector(state => state.logs);
  const collections = useSelector(state => state.collections.collections);
  const [activeTab, setActiveTab] = useState('request');

  if (!selectedRequest) return null;

  const { data } = selectedRequest;
  const { request, response } = data;

  const collection = collections.find(c => c.uid === selectedRequest.collectionUid) || { uid: 'terminal-collection' };

  const handleClose = () => {
    dispatch(clearSelectedRequest());
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getTabContent = () => {
    switch (activeTab) {
      case 'request':
        return <RequestTab request={request} response={response} />;
      case 'response':
        return <ResponseTab response={response} request={request} collection={collection} />;
      case 'network':
        return <NetworkTab response={response} />;
      default:
        return <RequestTab request={request} response={response} />;
    }
  };

  return (
    <StyledWrapper>
      <div className="panel-header">
        <div className="panel-title">
          <IconFileText size={16} strokeWidth={1.5} />
          <span>Request Details</span>
          <span className="request-time">({formatTime(selectedRequest.timestamp)})</span>
        </div>
        
        <button 
          className="close-button"
          onClick={handleClose}
          title="Close details panel"
        >
          <IconX size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="panel-tabs">
        <button 
          className={`tab-button ${activeTab === 'request' ? 'active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          <IconArrowRight size={14} strokeWidth={1.5} />
          Request
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'response' ? 'active' : ''}`}
          onClick={() => setActiveTab('response')}
        >
          <IconFileText size={14} strokeWidth={1.5} />
          Response
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          <IconNetwork size={14} strokeWidth={1.5} />
          Network
        </button>
      </div>

      <div className="panel-content">
        {getTabContent()}
      </div>
    </StyledWrapper>
  );
};

export default RequestDetailsPanel; 