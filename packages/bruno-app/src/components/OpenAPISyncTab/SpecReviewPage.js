import { useRef, useEffect } from 'react';
import { useTheme } from 'providers/Theme/index';
import Modal from 'components/Modal';

const SpecReviewPage = ({ diffResult, onClose }) => {
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
    <Modal
      size="xl"
      title="Spec Diff"
      hideFooter={true}
      handleCancel={onClose}
    >
      <div className="spec-diff-modal">
        <div className="spec-diff-badges">
          {addedCount > 0 && <span className="context-pill added">Added: {addedCount}</span>}
          {modifiedCount > 0 && <span className="context-pill spec">Updated: {modifiedCount}</span>}
          {removedCount > 0 && <span className="context-pill removed">Removed: {removedCount}</span>}
          {versionLabel && <span className="context-pill">{versionLabel}</span>}
        </div>

        <p className="spec-diff-subtitle">
          {diffResult?.storedSpecMissing
            ? 'The current spec file is missing. The full remote spec is shown below.'
            : 'Side-by-side diff of your current spec vs the updated spec from the spec URL.'}
        </p>

        <div className="spec-diff-body">
          <div className="text-diff-container">
            {diffResult?.unifiedDiff ? (
              <>
                <div className="diff-column-headers">
                  <span className="diff-column-label">{diffResult?.storedSpecMissing ? 'Current Spec (missing)' : 'Current Spec'}</span>
                  <span className="diff-column-label">Updated Spec</span>
                </div>
                <div ref={diffRef}></div>
              </>
            ) : (
              <div className="text-diff-empty">No text diff available.</div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SpecReviewPage;
