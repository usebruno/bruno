import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconX, IconCopy } from '@tabler/icons-react';
import Button from 'ui/Button';
import {
  clearSelectedRequest,
  selectSelectedRequest
} from 'providers/ReduxStore/slices/networkIntercept';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const TABS = [
  { id: 'request', label: 'Request' },
  { id: 'response', label: 'Response' },
  { id: 'headers', label: 'Headers' }
];

const RequestDetail = () => {
  const dispatch = useDispatch();
  const selectedRequest = useSelector(selectSelectedRequest);
  const [activeTab, setActiveTab] = useState('request');

  if (!selectedRequest) {
    return (
      <StyledWrapper>
        <div className="empty-detail">
          <div className="empty-icon">📋</div>
          <div className="empty-text">Select a request to view details</div>
        </div>
      </StyledWrapper>
    );
  }

  const handleClose = () => {
    dispatch(clearSelectedRequest());
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(selectedRequest.url);
    toast.success('URL copied to clipboard');
  };

  const formatHeaders = (headers) => {
    if (!headers) return [];
    return Object.entries(headers).map(([name, value]) => ({
      name,
      value: Array.isArray(value) ? value.join(', ') : value
    }));
  };

  const formatBody = (body) => {
    if (!body) return null;

    // Handle binary content
    if (typeof body === 'object' && body.type === 'binary') {
      return { type: 'binary', mimeType: body.mimeType };
    }

    // Try to pretty-print JSON
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return body;
    }
  };

  const getStatusClass = (statusCode) => {
    if (!statusCode) return '';
    if (statusCode >= 200 && statusCode < 300) return 'status-success';
    if (statusCode >= 300 && statusCode < 400) return 'status-redirect';
    return 'status-error';
  };

  const requestHeaders = formatHeaders(selectedRequest.headers);
  const responseHeaders = formatHeaders(selectedRequest.response?.headers);
  const requestBody = formatBody(selectedRequest.requestBody);
  const responseBody = formatBody(selectedRequest.response?.body);

  return (
    <StyledWrapper>
      <div className="detail-header">
        <div className="detail-title">
          <span className={`method-badge ${selectedRequest.method}`}>
            {selectedRequest.method}
          </span>
          <span className="url-text" title={selectedRequest.url}>
            {selectedRequest.url}
          </span>
        </div>
        <div className="detail-actions">
          <Button
            variant="ghost"
            color="secondary"
            size="sm"
            onClick={handleCopyUrl}
            title="Copy URL"
            icon={<IconCopy size={16} />}
          />
          <Button
            variant="ghost"
            color="secondary"
            size="sm"
            onClick={handleClose}
            title="Close"
            icon={<IconX size={16} />}
          />
        </div>
      </div>

      <div className="detail-tabs">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      <div className="detail-content">
        {activeTab === 'request' && (
          <>
            <div className="section">
              <div className="section-title">General</div>
              <div className="info-grid">
                <span className="info-label">URL</span>
                <span className="info-value">{selectedRequest.url}</span>
                <span className="info-label">Method</span>
                <span className="info-value">{selectedRequest.method}</span>
                <span className="info-label">Protocol</span>
                <span className="info-value">{selectedRequest.protocol?.toUpperCase()}</span>
                <span className="info-label">Host</span>
                <span className="info-value">{selectedRequest.host}</span>
                {selectedRequest.statusCode && (
                  <>
                    <span className="info-label">Status</span>
                    <span className={`info-value ${getStatusClass(selectedRequest.statusCode)}`}>
                      {selectedRequest.statusCode} {selectedRequest.statusMessage}
                    </span>
                  </>
                )}
                {selectedRequest.duration !== undefined && (
                  <>
                    <span className="info-label">Duration</span>
                    <span className="info-value">{selectedRequest.duration}ms</span>
                  </>
                )}
              </div>
            </div>

            {requestBody && (
              <div className="section">
                <div className="section-title">Request Body</div>
                {typeof requestBody === 'object' && requestBody.type === 'binary' ? (
                  <div className="binary-notice">
                    Binary content ({requestBody.mimeType})
                  </div>
                ) : (
                  <pre className={`body-content ${!requestBody ? 'empty' : ''}`}>
                    {requestBody || 'No request body'}
                  </pre>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'response' && (
          <>
            <div className="section">
              <div className="section-title">Response Info</div>
              {selectedRequest.response ? (
                <div className="info-grid">
                  <span className="info-label">Status</span>
                  <span className={`info-value ${getStatusClass(selectedRequest.statusCode)}`}>
                    {selectedRequest.statusCode} {selectedRequest.statusMessage}
                  </span>
                  <span className="info-label">Size</span>
                  <span className="info-value">
                    {selectedRequest.response.size
                      ? `${(selectedRequest.response.size / 1024).toFixed(2)} KB`
                      : '-'}
                  </span>
                  <span className="info-label">Duration</span>
                  <span className="info-value">{selectedRequest.duration}ms</span>
                </div>
              ) : (
                <div className="info-grid">
                  <span className="info-value">Response pending...</span>
                </div>
              )}
            </div>

            {selectedRequest.response && (
              <div className="section">
                <div className="section-title">Response Body</div>
                {typeof responseBody === 'object' && responseBody?.type === 'binary' ? (
                  <div className="binary-notice">
                    Binary content ({responseBody.mimeType})
                  </div>
                ) : (
                  <pre className={`body-content ${!responseBody ? 'empty' : ''}`}>
                    {responseBody || 'No response body'}
                  </pre>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'headers' && (
          <>
            <div className="section">
              <div className="section-title">Request Headers</div>
              {requestHeaders.length > 0 ? (
                <table className="headers-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestHeaders.map((header, index) => (
                      <tr key={index}>
                        <td className="header-name">{header.name}</td>
                        <td className="header-value">{header.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="body-content empty">No request headers</div>
              )}
            </div>

            {selectedRequest.response && (
              <div className="section">
                <div className="section-title">Response Headers</div>
                {responseHeaders.length > 0 ? (
                  <table className="headers-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {responseHeaders.map((header, index) => (
                        <tr key={index}>
                          <td className="header-name">{header.name}</td>
                          <td className="header-value">{header.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="body-content empty">No response headers</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </StyledWrapper>
  );
};

export default RequestDetail;
