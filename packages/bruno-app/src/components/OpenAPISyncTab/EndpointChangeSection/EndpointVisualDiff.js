import React from 'react';
import isEqual from 'lodash/isEqual';
import get from 'lodash/get';
import { useTranslation } from 'react-i18next';
import VisualDiffUrlBar from 'components/Git/VisualDiffViewer/VisualDiffUrlBar';
import VisualDiffParams from 'components/Git/VisualDiffViewer/VisualDiffParams';
import VisualDiffHeaders from 'components/Git/VisualDiffViewer/VisualDiffHeaders';
import VisualDiffAuth from 'components/Git/VisualDiffViewer/VisualDiffAuth';
import VisualDiffBody from 'components/Git/VisualDiffViewer/VisualDiffBody';
import VisualDiffContent from 'components/Git/VisualDiffViewer/VisualDiffContent/index';

// OpenAPI sync diff section configs (HTTP request sections only)
// Data format matches Git diff format: data.request.url, data.request.params, etc.
const openAPIDiffSectionDataPaths = {
  url: ['request.url', 'request.method'],
  params: 'request.params',
  headers: 'request.headers',
  auth: 'request.auth',
  body: 'request.body'
};

const openAPISectionHasChanges = (sectionKey, oldData, newData) => {
  // For body, only compare the mode and the content for the active mode(s)
  // The full request.body object can have extra empty properties that cause false positives
  if (sectionKey === 'body') {
    const oldBody = get(oldData, 'request.body', {});
    const newBody = get(newData, 'request.body', {});
    if (oldBody.mode !== newBody.mode) return true;
    const mode = oldBody.mode || newBody.mode;
    if (!mode || mode === 'none') return false;
    return !isEqual(oldBody[mode], newBody[mode]);
  }

  // For auth, only compare the mode and spec-derived fields for the active auth mode
  // Bruno adds extra fields (pkce, credentialsId, tokenQueryKey, etc.) that don't
  // come from the OpenAPI spec. Also, the converter generates ALL oauth2 fields
  // regardless of grant type, but the collection only stores relevant ones per flow.
  if (sectionKey === 'auth') {
    const oldAuth = get(oldData, 'request.auth', {});
    const newAuth = get(newData, 'request.auth', {});
    if (oldAuth.mode !== newAuth.mode) return true;
    const mode = oldAuth.mode || newAuth.mode;
    if (!mode || mode === 'none') return false;
    const oldConfig = oldAuth[mode] || {};
    const newConfig = newAuth[mode] || {};

    if (mode === 'oauth2') {
      // Compare only fields relevant to the specific grant type
      const grantType = oldConfig.grantType || newConfig.grantType;
      const commonFields = ['grantType', 'scope', 'state'];
      const grantTypeFields = {
        authorization_code: [...commonFields, 'authorizationUrl', 'accessTokenUrl', 'refreshTokenUrl', 'callbackUrl', 'clientId', 'clientSecret'],
        implicit: [...commonFields, 'authorizationUrl', 'callbackUrl'],
        password: [...commonFields, 'accessTokenUrl', 'refreshTokenUrl', 'clientId', 'clientSecret'],
        client_credentials: [...commonFields, 'accessTokenUrl', 'clientId', 'clientSecret']
      };
      const fields = grantTypeFields[grantType] || commonFields;
      return fields.some((field) => !isEqual(oldConfig[field], newConfig[field]));
    }

    // Other auth modes: compare only spec-relevant fields
    const specFields = {
      basic: ['username', 'password'],
      bearer: ['token'],
      apikey: ['key', 'value', 'placement'],
      digest: ['username', 'password']
    };
    const fields = specFields[mode];
    if (fields) {
      return fields.some((field) => !isEqual(oldConfig[field], newConfig[field]));
    }
    return !isEqual(oldConfig, newConfig);
  }

  const paths = openAPIDiffSectionDataPaths[sectionKey];

  if (Array.isArray(paths)) {
    return paths.some((path) => !isEqual(get(oldData, path), get(newData, path)));
  }

  return !isEqual(get(oldData, paths), get(newData, paths));
};

const openAPIDiffHasContent = {
  url: (data) => data?.request?.url || data?.request?.method,
  params: (data) => data?.request?.params && data.request.params.length > 0,
  headers: (data) => data?.request?.headers && data.request.headers.length > 0,
  auth: (data) => data?.request?.auth && data.request.auth.mode && data.request.auth.mode !== 'none',
  body: (data) => {
    if (!data?.request?.body) return false;
    const mode = data.request.body.mode;
    if (!mode || mode === 'none') return false;
    return data.request.body.json || data.request.body.text || data.request.body.xml
      || data.request.body.graphql || data.request.body.formUrlEncoded?.length > 0
      || data.request.body.multipartForm?.length > 0;
  }
};

const createOpenAPIDiffSections = (t) => [
  { key: 'url', title: 'URL', Component: VisualDiffUrlBar, hasContent: openAPIDiffHasContent.url },
  { key: 'params', title: t('OPENAPI_SYNC.PARAMETERS'), Component: VisualDiffParams, hasContent: openAPIDiffHasContent.params },
  { key: 'headers', title: t('OPENAPI_SYNC.HEADERS'), Component: VisualDiffHeaders, hasContent: openAPIDiffHasContent.headers },
  { key: 'auth', title: t('OPENAPI_SYNC.AUTHENTICATION'), Component: VisualDiffAuth, hasContent: openAPIDiffHasContent.auth },
  { key: 'body', title: t('OPENAPI_SYNC.BODY'), Component: VisualDiffBody, hasContent: openAPIDiffHasContent.body }
];

/**
 * EndpointVisualDiff - Wrapper around VisualDiffContent for OpenAPI sync
 *
 * Props:
 * - oldData: data from collection (actual current state)
 * - newData: data from spec (expected state)
 * - leftLabel/rightLabel: custom labels for diff panes
 * - swapSides: if true, show spec on left and collection on right
 */
const EndpointVisualDiff = ({
  oldData,
  newData,
  leftLabel = 'Current (in collection)',
  rightLabel = 'Expected (from spec)',
  swapSides = false
}) => {
  const { t } = useTranslation();
  const sections = createOpenAPIDiffSections(t);

  // Determine which data goes on which side based on swapSides
  const displayOldData = swapSides ? newData : oldData;
  const displayNewData = swapSides ? oldData : newData;

  return (
    <VisualDiffContent
      oldData={displayOldData}
      newData={displayNewData}
      sections={sections}
      sectionHasChanges={openAPISectionHasChanges}
      oldLabel={leftLabel}
      newLabel={rightLabel}
      hideUnchanged={true}
    />
  );
};

export default EndpointVisualDiff;
