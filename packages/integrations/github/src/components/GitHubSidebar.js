import React, { useState, useEffect, useCallback } from 'react';

/**
 * GitHub Sidebar Panel
 *
 * Shows recent repositories or a configuration prompt
 * when GitHub is not configured.
 */
const GitHubSidebar = () => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [configured, setConfigured] = useState(false);

  const checkConfiguration = useCallback(async () => {
    try {
      const result = await window.ipcRenderer.invoke('integration:github:check-config');
      setConfigured(result?.configured || false);
      if (result?.configured) {
        fetchRecentRepos();
      }
    } catch (err) {
      console.error('Failed to check GitHub config:', err);
      setConfigured(false);
    }
  }, []);

  const fetchRecentRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.ipcRenderer.invoke('integration:github:recent-repos');
      setRepos(result?.repos || []);
    } catch (err) {
      console.error('Failed to fetch repos:', err);
      setError('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConfiguration();
  }, [checkConfiguration]);

  const handleOpenRepo = (url) => {
    window.ipcRenderer.openExternal(url);
  };

  const styles = {
    container: {
      padding: '8px',
      fontSize: '12px'
    },
    unconfigured: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      padding: '16px 8px',
      textAlign: 'center',
      color: '#666'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    },
    title: {
      fontWeight: 500,
      fontSize: '11px',
      textTransform: 'uppercase',
      color: '#888'
    },
    refreshBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      opacity: loading ? 0.5 : 1
    },
    list: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    repoItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 8px',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'background 0.15s'
    },
    repoName: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: '140px'
    },
    repoStars: {
      fontSize: '10px',
      color: '#888'
    },
    error: {
      color: '#e53e3e',
      fontSize: '11px',
      padding: '8px'
    },
    empty: {
      color: '#888',
      fontSize: '11px',
      padding: '8px',
      textAlign: 'center'
    }
  };

  if (!configured) {
    return (
      <div style={styles.unconfigured}>
        <span>GitHub not configured</span>
        <span style={{ fontSize: '11px', color: '#888' }}>
          Set GITHUB_TOKEN in your environment to enable GitHub features
        </span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Recent Repos</span>
        <button
          style={styles.refreshBtn}
          onClick={fetchRecentRepos}
          disabled={loading}
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {!error && repos.length === 0 && !loading && (
        <div style={styles.empty}>No repositories found</div>
      )}

      {loading && <div style={styles.empty}>Loading...</div>}

      {!loading && repos.length > 0 && (
        <div style={styles.list}>
          {repos.map((repo) => (
            <div
              key={repo.id}
              style={styles.repoItem}
              onClick={() => handleOpenRepo(repo.html_url)}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={styles.repoName} title={repo.full_name}>
                {repo.name}
              </span>
              <span style={styles.repoStars}>★ {repo.stargazers_count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GitHubSidebar;
