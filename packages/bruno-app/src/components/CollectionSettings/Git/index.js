import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
  IconCloudDownload,
  IconCloudUpload,
  IconFolder,
  IconGitBranch,
  IconHistory,
  IconLink,
  IconRefresh,
  IconStars
} from '@tabler/icons';
import toast from 'react-hot-toast';
import StatusBadge from 'ui/StatusBadge';
import { clearGitChangeMarkers } from 'providers/ReduxStore/slices/collections';
import StyledWrapper from './StyledWrapper';

const getFileState = (rawStatus) => {
  const status = rawStatus === '?' ? 'A' : rawStatus;

  switch (status) {
    case 'A':
    case 'added':
      return { label: 'New', tone: 'success' };
    case 'D':
    case 'deleted':
      return { label: 'Deleted', tone: 'danger' };
    case 'R':
    case 'renamed':
      return { label: 'Renamed', tone: 'info' };
    default:
      return { label: 'Updated', tone: 'warning' };
  }
};

const getSyncSourceLabel = (source) => {
  switch (source) {
    case 'auto-pull':
      return 'Auto Pull';
    case 'force-pull':
      return 'Force Pull';
    default:
      return 'Pull';
  }
};

const formatSyncMessage = (result, defaultMessage) => {
  const changes = result?.changedFiles?.length || 0;
  if (!changes) {
    return defaultMessage;
  }

  return `${defaultMessage} (${changes} change${changes !== 1 ? 's' : ''})`;
};

// Accepts either a `collection` (Collection Settings) or a generic `target`
// ({ pathname, name, uid }) so the same panel works for a workspace too.
const Git = ({ collection: collectionProp, target }) => {
  const collection = target || collectionProp || {};
  const dispatch = useDispatch();
  const [info, setInfo] = useState(null);
  const [uncommitted, setUncommitted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmForcePull, setConfirmForcePull] = useState(false);
  const [commitDialog, setCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [changedFiles, setChangedFiles] = useState([]);

  const syncHistory = collection.gitSyncHistory || [];
  const pendingBadges = collection.gitChangeMarkers || [];

  const loadInfo = () => {
    if (!collection.pathname) return;
    setLoading(true);
    Promise.allSettled([
      window.ipcRenderer.invoke('renderer:git-get-repo-info', { collectionPath: collection.pathname }),
      window.ipcRenderer.invoke('renderer:git-get-status', { collectionPath: collection.pathname })
    ])
      .then(([repoResult, statusResult]) => {
        setInfo(repoResult.status === 'fulfilled' ? repoResult.value : null);
        setUncommitted(statusResult.status === 'fulfilled' ? (statusResult.value?.files || []) : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInfo();
  }, [collection.pathname]);

  const handlePull = () => {
    toast.promise(
      window.ipcRenderer.invoke('renderer:git-pull', { collectionPath: collection.pathname }),
      {
        loading: 'Running git pull...',
        success: (result) => {
          loadInfo();
          return formatSyncMessage(result, 'Pull completed');
        },
        error: (err) => `Pull error: ${err?.message || 'unknown'}`
      }
    );
  };

  const handlePushClick = async () => {
    try {
      const status = await window.ipcRenderer.invoke('renderer:git-get-status', {
        collectionPath: collection.pathname
      });
      if (!status.isClean) {
        setChangedFiles(status.files || []);
        setCommitMessage(`Update ${new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}`);
        setCommitDialog(true);
      } else {
        setChangedFiles([]);
        handlePush(null);
      }
    } catch {
      setChangedFiles([]);
      handlePush(null);
    }
  };

  const handlePush = (message) => {
    setCommitDialog(false);
    toast.promise(
      window.ipcRenderer.invoke('renderer:git-commit-and-push', {
        collectionPath: collection.pathname,
        commitMessage: message
      }),
      {
        loading: 'Pushing changes...',
        success: (msg) => {
          loadInfo();
          return msg || 'Push completed successfully';
        },
        error: (err) => `Push error: ${err?.message || 'unknown'}`
      }
    );
  };

  const handleForcePull = () => {
    setConfirmForcePull(false);
    toast.promise(
      window.ipcRenderer.invoke('renderer:git-force-pull', { collectionPath: collection.pathname }),
      {
        loading: 'Discarding local changes and updating...',
        success: (result) => {
          loadInfo();
          return formatSyncMessage(result, 'Collection synced with remote');
        },
        error: (err) => `Force pull error: ${err?.message || 'unknown'}`
      }
    );
  };

  const formatRemoteUrl = (url) => {
    if (!url) return null;
    return url.replace(/\/\/[^@]+@/, '//***@');
  };

  if (loading) {
    return <StyledWrapper className="git-shell empty-state">Loading repository information...</StyledWrapper>;
  }

  if (!info) {
    return <StyledWrapper className="git-shell empty-state">Could not retrieve repository information.</StyledWrapper>;
  }

  return (
    <StyledWrapper className="git-shell">
      <section className="page-header">
        <div className="page-title-block">
          <p className="eyebrow">Smart sync</p>
          <h3>{info.repoName || collection.name}</h3>
          <p className="hero-text">
            A clear summary of what arrived from the remote, what is still pending locally, and the updates you have not reviewed yet.
          </p>
        </div>

        <div className="header-badges">
          <StatusBadge status={pendingBadges.length ? 'info' : 'muted'} size="sm" radius="full">
            {pendingBadges.length ? `${pendingBadges.length} to review` : 'All reviewed'}
          </StatusBadge>
          <StatusBadge status={uncommitted.length ? 'success' : 'muted'} size="sm" radius="full">
            {uncommitted.length} local
          </StatusBadge>
          <p className="header-actions-hint" aria-hidden="true">
            Sync actions are in the status card, below the metrics.
          </p>
        </div>
      </section>

      <section className="top-grid">
        <section className="hero-card summary-card">
          <div className="section-header compact-header">
            <div>
              <h4>Repository status</h4>
              <p>The essentials to know whether to pull, push, or review updates.</p>
            </div>
          </div>

          <div className={`summary-banner ${info.behind > 0 ? 'warning' : info.ahead > 0 ? 'success' : 'muted'}`}>
            <IconStars size={16} strokeWidth={1.8} />
            <span>
              {info.behind > 0
                ? `There ${info.behind !== 1 ? 'are' : 'is'} ${info.behind} commit${info.behind !== 1 ? 's' : ''} pending to pull from the remote.`
                : info.ahead > 0
                  ? `There ${info.ahead !== 1 ? 'are' : 'is'} ${info.ahead} commit${info.ahead !== 1 ? 's' : ''} ready to push to the remote.`
                  : 'The local branch is in sync with the remote.'}
            </span>
          </div>

          <div className="metrics-grid">
            <div className="metric-card metric-card--ahead">
              <span className="metric-label">Ahead</span>
              <strong className="metric-value">{info.ahead}</strong>
            </div>
            <div className="metric-card metric-card--behind">
              <span className="metric-label">Behind</span>
              <strong className="metric-value">{info.behind}</strong>
            </div>
            <div className="metric-card metric-card--locales">
              <span className="metric-label">Local</span>
              <strong className="metric-value">{uncommitted.length}</strong>
            </div>
            <div className="metric-card metric-card--pendientes">
              <span className="metric-label">Pending</span>
              <strong className="metric-value">{pendingBadges.length}</strong>
            </div>
          </div>

          {!confirmForcePull && !commitDialog && (
            <div className="git-sync-actions">
              <p className="git-sync-actions-label">Sync</p>
              <div className="git-sync-actions-buttons" role="toolbar" aria-label="Git actions">
                <button type="button" className="git-sync-btn git-sync-btn--pull" onClick={handlePull}>
                  <IconCloudDownload size={14} strokeWidth={1.75} />
                  <span>Pull</span>
                </button>
                <button type="button" className="git-sync-btn git-sync-btn--push" onClick={handlePushClick}>
                  <IconCloudUpload size={14} strokeWidth={1.75} />
                  <span>Push</span>
                </button>
                <button
                  type="button"
                  className="git-sync-btn git-sync-btn--force"
                  onClick={() => setConfirmForcePull(true)}
                  title="Discards local changes and syncs with the remote"
                >
                  <IconAlertTriangle size={14} strokeWidth={1.75} />
                  <span>Force</span>
                </button>
                <button
                  type="button"
                  className="git-sync-btn git-sync-btn--refresh"
                  onClick={loadInfo}
                  aria-label="Refresh repository information"
                  title="Refresh"
                >
                  <IconRefresh size={15} strokeWidth={1.65} />
                </button>
              </div>
            </div>
          )}

          <div className="repo-details technical-panel">
            <div className="detail-row">
              <span className="detail-label">Branch</span>
              <div className="detail-value">
                <IconGitBranch size={14} strokeWidth={1.6} />
                <span>{info.branch || 'No branch detected'}</span>
              </div>
            </div>
            <div className="detail-row">
              <span className="detail-label">Remote</span>
              <div className="detail-value detail-path" title={formatRemoteUrl(info.remoteUrl)}>
                <IconLink size={14} strokeWidth={1.6} />
                <span>{formatRemoteUrl(info.remoteUrl) || 'No remote configured'}</span>
              </div>
            </div>
            <div className="detail-row">
              <span className="detail-label">Local path</span>
              <div className="detail-value detail-path" title={info.gitRootPath}>
                <IconFolder size={14} strokeWidth={1.6} />
                <span>{info.gitRootPath}</span>
              </div>
            </div>
          </div>

          <div className="signal-row signal-row-hero">
            <StatusBadge status={info.ahead > 0 ? 'success' : 'muted'} size="sm" radius="full">
              <IconArrowUp size={11} strokeWidth={2} />
              {info.ahead} ahead
            </StatusBadge>
            <StatusBadge status={info.behind > 0 ? 'warning' : 'muted'} size="sm" radius="full">
              <IconArrowDown size={11} strokeWidth={2} />
              {info.behind} behind
            </StatusBadge>
          </div>
        </section>
      </section>

      <section className="bottom-grid">
        <section className="section-card">
          <div className="section-header">
            <div>
              <h4>Recent history</h4>
              <p>The latest that arrived via `auto-pull`, manual `pull`, or `force pull`.</p>
            </div>
            {pendingBadges.length > 0 && (
              <button className="action-button subtle" onClick={() => dispatch(clearGitChangeMarkers({ collectionUid: collection.uid }))}>
                Clear markers
              </button>
            )}
          </div>

          {syncHistory.length ? (
            <div className="history-list scroll-area">
              {syncHistory.map((entry) => (
                <div key={entry.id} className="history-row">
                  <div className="history-meta">
                    <div className="history-title-row">
                      <div className="history-title">
                        <IconHistory size={14} strokeWidth={1.7} />
                        <span>{getSyncSourceLabel(entry.source)}</span>
                      </div>
                      <StatusBadge status={entry.hasChanges ? 'info' : 'muted'} size="xs" radius="full">
                        {entry.changedFiles?.length || 0} change{(entry.changedFiles?.length || 0) !== 1 ? 's' : ''}
                      </StatusBadge>
                    </div>
                    <p className="technical-text">{new Date(entry.pulledAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>

                  {entry.changedFiles?.length ? (
                    <div className="file-list compact-list file-list-divided">
                      {entry.changedFiles.slice(0, 8).map((file) => {
                        const state = getFileState(file.status);
                        return (
                          <div key={`${entry.id}-${file.absolutePath}`} className="file-row inline-row">
                            <StatusBadge status={state.tone} size="xs" radius="full">
                              {state.label}
                            </StatusBadge>
                            <span className="file-path" title={file.collectionRelativePath}>{file.collectionRelativePath}</span>
                          </div>
                        );
                      })}
                      {entry.changedFiles.length > 8 && (
                        <p className="subtle">And {entry.changedFiles.length - 8} more change(s)...</p>
                      )}
                    </div>
                  ) : (
                    <p className="subtle">No new files arrived in this sync.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="subtle">No pulls recorded in this session yet.</p>
          )}
        </section>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h4>Local changes</h4>
              <p>Files pending before `push`.</p>
            </div>
            {uncommitted.length > 0 && (
              <StatusBadge status="success" size="sm" radius="full">
                {uncommitted.length} pending
              </StatusBadge>
            )}
          </div>

          {uncommitted.length ? (
            <div className="file-list compact-scroll scroll-area file-list-divided">
              {uncommitted.map((file, index) => {
                const state = getFileState(file.status);
                return (
                  <div key={`${file.path}-${index}`} className="file-row inline-row">
                    <StatusBadge status={state.tone} size="xs" radius="full">
                      {state.label}
                    </StatusBadge>
                    <span className="file-path" title={file.path}>{file.path}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-block">
              <p className="subtle">No uncommitted local changes.</p>
            </div>
          )}
        </section>
      </section>

      {confirmForcePull && (
        <section className="section-card tone-warning">
          <div className="section-header">
            <div>
              <h4>Confirm Force Pull</h4>
              <p>This will discard everything local and replace the collection with `origin/{info.branch}`.</p>
            </div>
          </div>

          <div className="actions-row">
            <button onClick={handleForcePull} className="action-button warning">
              Yes, discard and update
            </button>
            <button onClick={() => setConfirmForcePull(false)} className="action-button neutral">
              Cancel
            </button>
          </div>
        </section>
      )}

      {commitDialog && (
        <section className="section-card tone-info">
          <div className="section-header">
            <div>
              <h4>Prepare commit before push</h4>
              <p>You are about to push local changes; here is exactly which files will be included.</p>
            </div>
          </div>

          {changedFiles.length > 0 && (
            <div className="file-list compact-list">
              {changedFiles.map((file, index) => {
                const state = getFileState(file.status);
                return (
                  <div key={`${file.path}-${index}`} className="file-row">
                    <StatusBadge status={state.tone} size="xs" radius="full">
                      {state.label}
                    </StatusBadge>
                    <span className="file-path" title={file.path}>{file.path}</span>
                  </div>
                );
              })}
            </div>
          )}

          <label className="input-label" htmlFor="git-commit-message">Commit message</label>
          <input
            id="git-commit-message"
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && commitMessage.trim()) {
                handlePush(commitMessage.trim());
              }
            }}
            className="commit-input"
            placeholder="Commit message..."
            autoFocus
          />

          <div className="actions-row">
            <button
              onClick={() => handlePush(commitMessage.trim() || commitMessage)}
              disabled={!commitMessage.trim()}
              className="action-button primary"
            >
              Commit and push
            </button>
            <button onClick={() => setCommitDialog(false)} className="action-button neutral">
              Cancel
            </button>
          </div>
        </section>
      )}
    </StyledWrapper>
  );
};

export default Git;
