import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const Cache = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const cacheStats = await window.ipcRenderer.invoke('renderer:get-cache-stats');
      setStats(cacheStats);
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      setStats({ error: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handlePurgeCache = async () => {
    setPurging(true);
    try {
      const result = await window.ipcRenderer.invoke('renderer:purge-cache');
      if (result.success) {
        toast.success('Cache purged successfully');
        await fetchStats();
      } else {
        toast.error(result.error || 'Failed to purge cache');
      }
    } catch (error) {
      console.error('Error purging cache:', error);
      toast.error('Failed to purge cache');
    } finally {
      setPurging(false);
    }
  };

  return (
    <StyledWrapper className="w-full">
      <div className="section-title">Collection Cache</div>
      <p className="description mb-4">
        Bruno caches parsed collection files to improve loading performance. Clearing the cache will cause collections to be fully re-parsed on next load.
      </p>

      <div className="cache-stats">
        {loading ? (
          <div className="stat-item">
            <span className="stat-label">Loading...</span>
          </div>
        ) : stats?.error ? (
          <div className="stat-item">
            <span className="stat-label">Error: {stats.error}</span>
          </div>
        ) : (
          <>
            <div className="stat-item">
              <span className="stat-label">Cached Collections</span>
              <span className="stat-value">{stats?.totalCollections ?? 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Cached Files</span>
              <span className="stat-value">{stats?.totalFiles ?? 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Cache Version</span>
              <span className="stat-value">{stats?.version ?? 'N/A'}</span>
            </div>
          </>
        )}
      </div>

      <button
        className="purge-button"
        onClick={handlePurgeCache}
        disabled={purging || loading}
      >
        {purging ? 'Purging...' : 'Purge Cache'}
      </button>
    </StyledWrapper>
  );
};

export default Cache;
