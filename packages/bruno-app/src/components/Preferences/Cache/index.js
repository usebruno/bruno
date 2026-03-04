import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import get from 'lodash/get';
import toast from 'react-hot-toast';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const Cache = () => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const cacheEnabled = get(preferences, 'cache.enabled', false);

  const handleToggleCache = () => {
    dispatch(
      savePreferences({
        ...preferences,
        cache: {
          ...preferences.cache,
          enabled: !cacheEnabled
        }
      })
    ).catch((err) => {
      console.error('Failed to save cache preference:', err);
      toast.error('Failed to save preference');
    });
  };

  const fetchStats = useCallback(async () => {
    try {
      const cacheStats = await window.ipcRenderer.invoke('renderer:get-file-cache-stats');
      setStats(cacheStats);
    } catch (err) {
      console.error('Failed to fetch cache stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleClearCache = async () => {
    setClearing(true);
    try {
      await window.ipcRenderer.invoke('renderer:clear-file-cache');
      toast.success('Cache cleared successfully');
      await fetchStats();
    } catch (err) {
      console.error('Failed to clear cache:', err);
      toast.error('Failed to clear cache');
    } finally {
      setClearing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchStats();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <StyledWrapper>
        <div className="text-muted">Loading cache statistics...</div>
      </StyledWrapper>
    );
  }

  const collectionCount = stats?.byCollection ? Object.keys(stats.byCollection).length : 0;

  return (
    <StyledWrapper>
      <div className="text-muted">
        Bruno caches parsed collection files to speed up loading. Files are automatically reloaded when modified.
      </div>

      <div className="flex items-center mt-2">
        <input
          id="cacheEnabled"
          type="checkbox"
          checked={cacheEnabled}
          onChange={handleToggleCache}
          className="mousetrap mr-0"
        />
        <label className="block ml-2 select-none" htmlFor="cacheEnabled">
          Enable File Cache
        </label>
      </div>

      <table className={`cache-stats mt-4 ${!cacheEnabled ? 'opacity-50' : ''}`}>
        <tbody>
          <tr>
            <td className="label">Cached Files</td>
            <td className="value">{stats?.fileCount || 0}</td>
          </tr>
          <tr>
            <td className="label">Collections</td>
            <td className="value">{collectionCount}</td>
          </tr>
          <tr>
            <td className="label">Total Size</td>
            <td className="value">{formatBytes(stats?.totalSizeBytes || 0)}</td>
          </tr>
        </tbody>
      </table>

      <div className={`flex items-center gap-2 mt-4 ${!cacheEnabled ? 'opacity-50' : ''}`}>
        <Button
          size="sm"
          variant="outline"
          color="secondary"
          disabled={refreshing || !cacheEnabled}
          loading={refreshing}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
        <Button
          size="sm"
          variant="outline"
          color="secondary"
          disabled={clearing || !stats?.fileCount || !cacheEnabled}
          loading={clearing}
          onClick={handleClearCache}
        >
          Clear Cache
        </Button>
      </div>

      {stats?.fileCount === 0 && cacheEnabled && (
        <div className="text-muted">Cache is empty</div>
      )}
    </StyledWrapper>
  );
};

export default Cache;
