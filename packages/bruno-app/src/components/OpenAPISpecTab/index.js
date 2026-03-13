import React, { useState, useEffect, useCallback } from 'react';
import { IconLoader2, IconCloud } from '@tabler/icons';
import fastJsonFormat from 'fast-json-format';
import SpecViewer from 'components/ApiSpecPanel/SpecViewer';
import StyledWrapper from 'components/ApiSpecPanel/StyledWrapper';

/**
 * Pretty-print JSON content for readable display. YAML content is returned as-is.
 */
const prettyPrintSpec = (content) => {
  if (!content) return content;
  try {
    return fastJsonFormat(content);
  } catch {
    return content;
  }
};

const OpenAPISpecTab = ({ collection }) => {
  const [specContent, setSpecContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRemote, setIsRemote] = useState(false);

  const openApiSyncConfig = collection?.brunoConfig?.openapi?.[0];
  const sourceUrl = openApiSyncConfig?.sourceUrl;

  const loadSpec = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsRemote(false);
    try {
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:read-openapi-spec', {
        collectionPath: collection.pathname,
        sourceUrl
      });
      if (result.error) {
        // Local file not found — fall back to fetching from remote URL
        if (sourceUrl) {
          const fetchResult = await ipcRenderer.invoke('renderer:fetch-openapi-spec', {
            collectionUid: collection.uid,
            collectionPath: collection.pathname,
            sourceUrl,
            environmentContext: {
              activeEnvironmentUid: collection.activeEnvironmentUid,
              environments: collection.environments,
              runtimeVariables: collection.runtimeVariables,
              globalEnvironmentVariables: collection.globalEnvironmentVariables
            }
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
      setError(err.message || 'Failed to read spec file');
    } finally {
      setIsLoading(false);
    }
  }, [collection?.pathname, collection?.uid, collection?.activeEnvironmentUid, collection?.environments, collection?.runtimeVariables, collection?.globalEnvironmentVariables, sourceUrl]);

  useEffect(() => {
    if (collection?.pathname) {
      loadSpec();
    }
  }, [loadSpec]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 opacity-50">
        <IconLoader2 size={20} className="animate-spin" />
        <span>Loading spec...</span>
      </div>
    );
  }

  if (error || !specContent) {
    return (
      <div className="flex items-center justify-center h-full opacity-50">
        <span>{error || 'No spec file found. Sync your collection first.'}</span>
      </div>
    );
  }

  return (
    <StyledWrapper className="flex flex-col flex-grow relative">
      {isRemote && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs opacity-60" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <IconCloud size={14} />
          <span>Showing spec file from {sourceUrl}.</span>
        </div>
      )}
      <SpecViewer content={specContent} readOnly />
    </StyledWrapper>
  );
};

export default OpenAPISpecTab;
