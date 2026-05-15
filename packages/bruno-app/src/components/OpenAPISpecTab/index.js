import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import find from 'lodash/find';
import { IconLoader2, IconCloud } from '@tabler/icons';
import fastJsonFormat from 'fast-json-format';
import SpecViewer from 'components/ApiSpecPanel/SpecViewer';
import StyledWrapper from 'components/ApiSpecPanel/StyledWrapper';
import { updateApiSpecTabLeftPaneWidth } from 'providers/ReduxStore/slices/tabs';
import { useTranslation } from 'react-i18next';

/**
 * Pretty-print JSON content for readable display. YAML content is returned as-is.
 */
const prettyPrintSpec = (content) => {
  if (!content) return content;
  if (content.trimStart()[0] !== '{') return content;
  try {
    return fastJsonFormat(content);
  } catch {
    return content;
  }
};

const OpenAPISpecTab = ({ collection, tabUid }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const leftPaneWidth = useSelector((state) => {
    const tab = find(state.tabs.tabs, (t) => t.uid === tabUid);
    return tab?.apiSpecLeftPaneWidth ?? null;
  });
  const handleLeftPaneWidthChange = useCallback(
    (w) => dispatch(updateApiSpecTabLeftPaneWidth({ uid: tabUid, apiSpecLeftPaneWidth: w })),
    [dispatch, tabUid]
  );

  const [specContent, setSpecContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRemote, setIsRemote] = useState(false);

  const openApiSyncConfig = collection?.brunoConfig?.openapi?.[0];
  const sourceUrl = openApiSyncConfig?.sourceUrl;

  // Latest env context for loadSpec's remote-fetch fallback. Kept out of
  // loadSpec's deps so toggling a variable doesn't refire the spec load.
  const envContextRef = useRef({});
  envContextRef.current = {
    activeEnvironmentUid: collection?.activeEnvironmentUid,
    environments: collection?.environments,
    runtimeVariables: collection?.runtimeVariables,
    globalEnvironmentVariables: collection?.globalEnvironmentVariables
  };

  const loadSpec = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsRemote(false);
    try {
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:read-openapi-spec', {
        collectionPath: collection.pathname
      });
      if (result.error) {
        // Local file not found — fall back to fetching from remote URL
        if (sourceUrl) {
          const fetchResult = await ipcRenderer.invoke('renderer:fetch-openapi-spec', {
            collectionUid: collection.uid,
            collectionPath: collection.pathname,
            sourceUrl,
            environmentContext: envContextRef.current
          });
          if (fetchResult.content) {
            setSpecContent(prettyPrintSpec(fetchResult.content));
            setIsRemote(true);
            return;
          }
        }
        setError(result.error);
      } else {
        setSpecContent(prettyPrintSpec(result.content));
      }
    } catch (err) {
      setError(err.message || t('OPENAPI_SPEC_TAB.READ_SPEC_FAILED'));
    } finally {
      setIsLoading(false);
    }
  }, [collection?.pathname, collection?.uid, sourceUrl]);

  useEffect(() => {
    if (collection?.pathname) {
      loadSpec();
    }
  }, [loadSpec]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 opacity-50">
        <IconLoader2 size={20} className="animate-spin" />
        <span>{t('OPENAPI_SPEC_TAB.LOADING')}</span>
      </div>
    );
  }

  if (error || !specContent) {
    return (
      <div className="flex items-center justify-center h-full opacity-50">
        <span>{error || t('OPENAPI_SPEC_TAB.NO_SPEC_FOUND')}</span>
      </div>
    );
  }

  return (
    <StyledWrapper className="flex flex-col flex-grow relative">
      {isRemote && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs opacity-60" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <IconCloud size={14} />
          <span>{t('OPENAPI_SPEC_TAB.SHOWING_REMOTE_SPEC', { sourceUrl })}</span>
        </div>
      )}
      <SpecViewer
        content={specContent}
        readOnly
        leftPaneWidth={leftPaneWidth}
        onLeftPaneWidthChange={handleLeftPaneWidthChange}
      />
    </StyledWrapper>
  );
};

export default OpenAPISpecTab;
