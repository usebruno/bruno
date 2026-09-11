import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences, clearHttpHttpsAgentCache } from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconEraser } from '@tabler/icons';
import { useSqliteQuery, useSqliteMutation } from '@usebruno/sqlite/web';
import { useTheme } from 'providers/Theme';
import ToggleSwitch from 'components/ToggleSwitch';
import ActionIcon from 'ui/ActionIcon';
import StyledWrapper from './StyledWrapper';
import { formatSize } from 'utils/common';

const Cache = () => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();
  const { theme } = useTheme();

  const fileCacheEnabled = get(preferences, 'cache.file.enabled', false);
  const sslSessionEnabled = get(preferences, 'cache.sslSession.enabled', false);

  const { data: fileCacheSizeRow } = useSqliteQuery('file_index_size');
  const fileCacheSize = fileCacheSizeRow?.bytes ?? null;

  const clearFileCache = useSqliteMutation('file_index_clear');
  const vacuumFileCache = useSqliteMutation('file_index_vacuum');

  const persist = (next) => {
    dispatch(savePreferences({ ...preferences, cache: next })).catch(() => {
      toast.error('Failed to update cache preferences');
    });
  };

  const handleToggleFileCache = () => {
    persist({
      ...preferences.cache,
      file: { enabled: !fileCacheEnabled }
    });
  };

  const handleToggleSslSession = () => {
    const next = !sslSessionEnabled;
    persist({
      ...preferences.cache,
      sslSession: { enabled: next }
    });
    if (!next) {
      dispatch(clearHttpHttpsAgentCache()).catch(() => {});
    }
  };

  const handleClearFileCache = async () => {
    try {
      await clearFileCache.mutateAsync({});
      await vacuumFileCache.mutateAsync({});
      toast.success('File cache cleared');
    } catch (error) {
      toast.error('Failed to clear file cache');
    }
  };

  const handleClearSslSession = () => {
    dispatch(clearHttpHttpsAgentCache())
      .then(() => toast.success('SSL session cache cleared'))
      .catch(() => toast.error('Failed to clear SSL session cache'));
  };

  return (
    <StyledWrapper className="w-full">
      <div className="cache-section-title">Cache</div>

      <div className="cache-item">
        <div className="cache-item-header">
          <div className="cache-item-title-group">
            <span className="cache-item-title">File cache</span>
            <span className="beta-badge">Beta</span>
          </div>
          <ToggleSwitch
            data-testid="cache.file.enabled"
            isOn={fileCacheEnabled}
            handleToggle={handleToggleFileCache}
            size="2xs"
            activeColor={theme.primary.solid}
          />
        </div>
        <div className="cache-item-body">
          <div className="cache-item-body-text">
            <p className="cache-item-description">
              Loads your workspace faster by caching opened collections. Bruno refreshes the cache when your collection
              changes. Clearing it won't affect your original files.
            </p>
            <p className="cache-item-size">
              Cache size <strong>{fileCacheSize == null ? '—' : formatSize(fileCacheSize)}</strong>
            </p>
          </div>
          <ActionIcon
            label="Clear cache"
            onClick={handleClearFileCache}
            disabled={!fileCacheSize}
            colorOnHover={theme.colors.text.danger}
          >
            <IconEraser size={16} strokeWidth={1.5} />
          </ActionIcon>
        </div>
      </div>

      <div className="cache-item">
        <div className="cache-item-header">
          <div className="cache-item-title-group">
            <span className="cache-item-title">SSL session cache</span>
          </div>
          <ToggleSwitch
            data-testid="sslSession.enabled"
            isOn={sslSessionEnabled}
            handleToggle={handleToggleSslSession}
            size="2xs"
            activeColor={theme.primary.solid}
          />
        </div>
        <div className="cache-item-body">
          <div className="cache-item-body-text">
            <p className="cache-item-description">
              Reuses TLS sessions and connections across requests for faster handshakes. Disable to create a fresh
              connection for every request.
            </p>
          </div>
          <ActionIcon
            label="Clear cache"
            onClick={handleClearSslSession}
            colorOnHover={theme.colors.text.danger}
          >
            <IconEraser size={16} strokeWidth={1.5} />
          </ActionIcon>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Cache;
