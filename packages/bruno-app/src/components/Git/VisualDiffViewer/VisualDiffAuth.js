import React, { useMemo } from 'react';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import { useTranslation } from 'react-i18next';

const VisualDiffAuth = ({ oldData, newData, showSide }) => {
  const { t } = useTranslation();

  const AUTH_TYPE_LABELS = {
    awsv4: t('GIT.VISUAL_DIFF.AUTH_TYPE.AWS_V4'),
    basic: t('GIT.VISUAL_DIFF.AUTH_TYPE.BASIC'),
    bearer: t('GIT.VISUAL_DIFF.AUTH_TYPE.BEARER'),
    digest: t('GIT.VISUAL_DIFF.AUTH_TYPE.DIGEST'),
    ntlm: t('GIT.VISUAL_DIFF.AUTH_TYPE.NTLM'),
    oauth2: t('GIT.VISUAL_DIFF.AUTH_TYPE.OAUTH2'),
    wsse: t('GIT.VISUAL_DIFF.AUTH_TYPE.WSSE'),
    apikey: t('GIT.VISUAL_DIFF.AUTH_TYPE.API_KEY')
  };

  const AUTH_FIELD_LABELS = {
    // AWS v4
    accessKeyId: t('GIT.VISUAL_DIFF.AUTH_FIELD.ACCESS_KEY_ID'),
    secretAccessKey: t('GIT.VISUAL_DIFF.AUTH_FIELD.SECRET_ACCESS_KEY'),
    sessionToken: t('GIT.VISUAL_DIFF.AUTH_FIELD.SESSION_TOKEN'),
    service: t('GIT.VISUAL_DIFF.AUTH_FIELD.SERVICE'),
    region: t('GIT.VISUAL_DIFF.AUTH_FIELD.REGION'),
    profileName: t('GIT.VISUAL_DIFF.AUTH_FIELD.PROFILE_NAME'),
    // Basic/Digest/NTLM/WSSE
    username: t('GIT.VISUAL_DIFF.AUTH_FIELD.USERNAME'),
    password: t('GIT.VISUAL_DIFF.AUTH_FIELD.PASSWORD'),
    domain: t('GIT.VISUAL_DIFF.AUTH_FIELD.DOMAIN'),
    // Bearer
    token: t('GIT.VISUAL_DIFF.AUTH_FIELD.TOKEN'),
    // API Key
    key: t('GIT.VISUAL_DIFF.AUTH_FIELD.KEY'),
    value: t('GIT.VISUAL_DIFF.AUTH_FIELD.VALUE'),
    placement: t('GIT.VISUAL_DIFF.AUTH_FIELD.PLACEMENT'),
    // OAuth2
    grantType: t('GIT.VISUAL_DIFF.AUTH_FIELD.GRANT_TYPE'),
    callbackUrl: t('GIT.VISUAL_DIFF.AUTH_FIELD.CALLBACK_URL'),
    authorizationUrl: t('GIT.VISUAL_DIFF.AUTH_FIELD.AUTHORIZATION_URL'),
    accessTokenUrl: t('GIT.VISUAL_DIFF.AUTH_FIELD.ACCESS_TOKEN_URL'),
    refreshTokenUrl: t('GIT.VISUAL_DIFF.AUTH_FIELD.REFRESH_TOKEN_URL'),
    clientId: t('GIT.VISUAL_DIFF.AUTH_FIELD.CLIENT_ID'),
    clientSecret: t('GIT.VISUAL_DIFF.AUTH_FIELD.CLIENT_SECRET'),
    scope: t('GIT.VISUAL_DIFF.AUTH_FIELD.SCOPE'),
    state: t('GIT.VISUAL_DIFF.AUTH_FIELD.STATE'),
    pkce: t('GIT.VISUAL_DIFF.AUTH_FIELD.PKCE'),
    credentialsPlacement: t('GIT.VISUAL_DIFF.AUTH_FIELD.CREDENTIALS_PLACEMENT'),
    credentialsId: t('GIT.VISUAL_DIFF.AUTH_FIELD.CREDENTIALS_ID'),
    tokenPlacement: t('GIT.VISUAL_DIFF.AUTH_FIELD.TOKEN_PLACEMENT'),
    tokenHeaderPrefix: t('GIT.VISUAL_DIFF.AUTH_FIELD.TOKEN_HEADER_PREFIX'),
    tokenQueryKey: t('GIT.VISUAL_DIFF.AUTH_FIELD.TOKEN_QUERY_KEY'),
    autoFetchToken: t('GIT.VISUAL_DIFF.AUTH_FIELD.AUTO_FETCH_TOKEN'),
    autoRefreshToken: t('GIT.VISUAL_DIFF.AUTH_FIELD.AUTO_REFRESH_TOKEN')
  };
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
                <th style={{ width: '40%' }}>{t('GIT.VISUAL_DIFF.TABLE.FIELD')}</th>
                <th>{t('GIT.VISUAL_DIFF.TABLE.VALUE')}</th>
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
                <td className="key-cell">{t('GIT.VISUAL_DIFF.AUTH_MODE')}</td>
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
                <th style={{ width: '40%' }}>{t('GIT.VISUAL_DIFF.TABLE.FIELD')}</th>
                <th>{t('GIT.VISUAL_DIFF.TABLE.VALUE')}</th>
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
