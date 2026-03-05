import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconAlertCircle, IconRefresh } from '@tabler/icons';
import get from 'lodash/get';
import toast from 'react-hot-toast';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';
import { Tooltip } from 'react-tooltip';

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
      <div className="section-header">
        <span>Cache</span>
      </div>
      <div className="flex max-w-xs items-center mt-2">
        <input
          id="cacheEnabled"
          type="checkbox"
          checked={cacheEnabled}
          onChange={handleToggleCache}
          className="mousetrap mr-0"
        />
        <label className="inline-flex items-center ml-2 select-none" htmlFor="cacheEnabled">
          <span>Enable</span>
          <span id="cache-tooltip" className="ml-2">
            <IconAlertCircle size={16} className="tooltip-icon" />
          </span>
          <Tooltip
            anchorId="cache-tooltip"
            className="tooltip-mod font-normal"
            html="Enabling cache will store copies of files you've opened for faster access later. <br/> It can be cleared anytime without affecting your original files."
          />
        </label>
        <Button
          size="xs"
          color="secondary"
          className="ml-auto"
          disabled={refreshing || !cacheEnabled}
          loading={refreshing}
          onClick={handleRefresh}
        >
          <IconRefresh size={16} strokeWidth={1.5} />
        </Button>
      </div>

      <table className={`max-w-xs w-full cache-stats mt-4 ${!cacheEnabled ? 'opacity-50' : ''}`}>
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
          disabled={clearing || !stats?.fileCount || !cacheEnabled}
          loading={clearing}
          onClick={handleClearCache}
        >
          Clear Cache
        </Button>
      </div>

    </StyledWrapper>
  );
};

export default Cache;
