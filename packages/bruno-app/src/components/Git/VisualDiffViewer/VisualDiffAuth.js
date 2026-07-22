import React, { useMemo } from 'react';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';

const AUTH_TYPE_LABELS = {
  awsv4: 'AWS Signature v4',
  basic: 'Basic Auth',
  bearer: 'Bearer Token',
  digest: 'Digest Auth',
  ntlm: 'NTLM',
  oauth2: 'OAuth 2.0',
  wsse: 'WSSE',
  apikey: 'API Key'
};

const AUTH_FIELD_LABELS = {
  // AWS v4
  accessKeyId: 'Access Key ID',
  secretAccessKey: 'Secret Access Key',
  sessionToken: 'Session Token',
  service: 'Service',
  region: 'Region',
  profileName: 'Profile Name',
  // Basic/Digest/NTLM/WSSE
  username: 'Username',
  password: 'Password',
  domain: 'Domain',
  // Bearer
  token: 'Token',
  // API Key
  key: 'Key',
  value: 'Value',
  placement: 'Placement',
  // OAuth2
  grantType: 'Grant Type',
  callbackUrl: 'Callback URL',
  authorizationUrl: 'Authorization URL',
  accessTokenUrl: 'Access Token URL',
  refreshTokenUrl: 'Refresh Token URL',
  clientId: 'Client ID',
  clientSecret: 'Client Secret',
  scope: 'Scope',
  state: 'State',
  pkce: 'PKCE',
  credentialsPlacement: 'Credentials Placement',
  credentialsId: 'Credentials ID',
  tokenPlacement: 'Token Placement',
  tokenHeaderPrefix: 'Token Header Prefix',
  tokenQueryKey: 'Token Query Key',
  autoFetchToken: 'Auto Fetch Token',
  autoRefreshToken: 'Auto Refresh Token'
};

const VisualDiffAuth = ({ oldData, newData, showSide }) => {
  const oldAuth = get(oldData, 'request.auth', {});
  const newAuth = get(newData, 'request.auth', {});

  const currentAuth = showSide === 'old' ? oldAuth : newAuth;
  const otherAuth = showSide === 'old' ? newAuth : oldAuth;

  const authTypes = useMemo(() => {
    const types = new Set([...Object.keys(currentAuth), ...Object.keys(otherAuth)]);
    types.delete('mode');
    return Array.from(types);
  }, [currentAuth, otherAuth]);

  const authSections = useMemo(() => {
    return authTypes.map((authType) => {
      const rawCurrentConfig = currentAuth[authType];
      const rawOtherConfig = otherAuth[authType];
      const currentConfig = (typeof rawCurrentConfig === 'object' && rawCurrentConfig !== null) ? rawCurrentConfig : {};
      const otherConfig = (typeof rawOtherConfig === 'object' && rawOtherConfig !== null) ? rawOtherConfig : {};

      if (Object.keys(currentConfig).length === 0 && showSide === 'old') {
        return null;
      }
      if (Object.keys(currentConfig).length === 0 && showSide === 'new') {
        return null;
      }

      let sectionStatus = 'unchanged';
      if (Object.keys(otherConfig).length === 0) {
        sectionStatus = showSide === 'old' ? 'deleted' : 'added';
      } else if (!isEqual(currentConfig, otherConfig)) {
        sectionStatus = 'modified';
      }

      const allFields = new Set([...Object.keys(currentConfig), ...Object.keys(otherConfig)]);
      const fields = Array.from(allFields).map((field) => {
        const currentValue = currentConfig[field];
        const otherValue = otherConfig[field];

        let status = 'unchanged';
        if (otherValue === undefined) {
          status = showSide === 'old' ? 'deleted' : 'added';
        } else if (currentValue !== otherValue) {
          status = 'modified';
        }

        let displayValue = currentValue;
        if (typeof displayValue === 'boolean') {
          displayValue = displayValue ? 'true' : 'false';
        } else if (displayValue === undefined || displayValue === null) {
          displayValue = '';
        }

        return {
          key: AUTH_FIELD_LABELS[field] || field,
          value: String(displayValue),
          status
        };
      });

      return {
        type: authType,
        label: AUTH_TYPE_LABELS[authType] || authType,
        status: sectionStatus,
        fields
      };
    }).filter(Boolean);
  }, [authTypes, currentAuth, otherAuth, showSide]);

  const currentMode = currentAuth.mode;
  const otherMode = otherAuth.mode;
  const modeStatus = currentMode !== otherMode ? (otherMode === undefined ? (showSide === 'old' ? 'deleted' : 'added') : 'modified') : 'unchanged';

  if (authSections.length === 0 && !currentMode) {
    return null;
  }

  return (
    <>
      {currentMode && (
        <div className="diff-section">
          <table className="diff-table">
            <thead>
              <tr>
                <th style={{ width: '30px' }}></th>
                <th style={{ width: '40%' }}>Field</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className={modeStatus}>
                <td>
                  {modeStatus !== 'unchanged' && (
                    <span className={`status-badge ${modeStatus}`}>
                      {modeStatus === 'added' ? 'A' : modeStatus === 'deleted' ? 'D' : 'M'}
                    </span>
                  )}
                </td>
                <td className="key-cell">Auth Mode</td>
                <td className="value-cell">{AUTH_TYPE_LABELS[currentMode] || currentMode}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {authSections.map((section) => (
        <div key={section.type} className="diff-section">
          <div className="diff-section-header">
            <span>{section.label}</span>
            {section.status !== 'unchanged' && (
              <span className={`status-badge ${section.status}`}>
                {section.status === 'added' ? 'A' : section.status === 'deleted' ? 'D' : 'M'}
              </span>
            )}
          </div>
          <table className="diff-table">
            <thead>
              <tr>
                <th style={{ width: '30px' }}></th>
                <th style={{ width: '40%' }}>Field</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {section.fields.map((field, index) => (
                <tr key={index} className={field.status}>
                  <td>
                    {field.status !== 'unchanged' && (
                      <span className={`status-badge ${field.status}`}>
                        {field.status === 'added' ? 'A' : field.status === 'deleted' ? 'D' : 'M'}
                      </span>
                    )}
                  </td>
                  <td className="key-cell">{field.key}</td>
                  <td className="value-cell">{field.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
};

export default VisualDiffAuth;
