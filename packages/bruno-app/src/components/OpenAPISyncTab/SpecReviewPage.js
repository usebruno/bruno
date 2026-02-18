import { useRef, useEffect } from 'react';
import { IconArrowLeft } from '@tabler/icons';
import { useTheme } from 'providers/Theme/index';
import Button from 'ui/Button';

const SpecReviewPage = ({ diffResult, onSync, onGoBack, isSyncing }) => {
  const diffRef = useRef(null);
  const { displayedTheme } = useTheme();

  const addedCount = diffResult?.added?.length || 0;
  const modifiedCount = diffResult?.modified?.length || 0;
  const removedCount = diffResult?.removed?.length || 0;

  const versionLabel = diffResult?.versionChanged
    ? `v${diffResult.storedVersion || '?'} → v${diffResult.newVersion}`
    : null;

  // Render Diff2Html
  useEffect(() => {
    const { Diff2Html } = window;
    if (!diffRef?.current || !Diff2Html || !diffResult?.unifiedDiff) return;
    const diffHtml = Diff2Html.html(diffResult.unifiedDiff, {
      drawFileList: false,
      matching: 'lines',
      outputFormat: 'side-by-side',
      synchronisedScroll: true,
      highlight: true,
      renderNothingWhenEmpty: false,
      colorScheme: displayedTheme
    });
    diffRef.current.innerHTML = diffHtml;
  }, [diffRef, displayedTheme, diffResult?.unifiedDiff]);

  return (
    <div className="sync-review-page">
      <div className="sync-review-header">
        <span className="back-link" onClick={onGoBack}>
          <IconArrowLeft size={14} />
          Back to Overview
        </span>

        <div className="title-row">
          <h3 className="review-title">Review Spec Changes</h3>
          <div className="review-badges">
            <div className="badge-row">
              {addedCount > 0 && <span className="context-pill added">New in spec: {addedCount}</span>}
              {modifiedCount > 0 && <span className="context-pill spec">Updated in spec: {modifiedCount}</span>}
              {removedCount > 0 && <span className="context-pill removed">Removed from spec: {removedCount}</span>}
              {versionLabel && <span className="context-pill">{versionLabel}</span>}
            </div>
          </div>
        </div>

        <p className="review-subtitle">
          {diffResult?.storedSpecMissing
            ? 'The local spec file is missing. The full remote spec is shown below. Syncing will restore the local baseline.'
            : 'The following changes were detected in the remote OpenAPI spec. Syncing will update your collection to match.'}
        </p>
      </div>

      <div className="sync-review-body">
        <div className="text-diff-container">
          {diffResult?.unifiedDiff ? (
            <>
              <div className="diff-column-headers">
                <span className="diff-column-label">{diffResult?.storedSpecMissing ? 'Local Spec (missing)' : 'Local Spec'}</span>
                <span className="diff-column-label">Remote Spec</span>
              </div>
              <div ref={diffRef}></div>
            </>
          ) : (
            <div className="text-diff-empty">No text diff available.</div>
          )}
        </div>
      </div>

      <div className="sync-review-bottom-bar">
        <div />
        <div className="bar-actions">
          <Button variant="ghost" onClick={onGoBack}>Go Back</Button>
          <Button
            onClick={() => onSync('sync')}
            disabled={isSyncing}
            loading={isSyncing}
          >
            Review and Sync Collection
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SpecReviewPage;
