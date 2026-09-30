import { useRef, useEffect, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { IconLoader2, IconChevronUp, IconChevronDown } from '@tabler/icons';
import Modal from 'components/Modal';
import StatusBadge from 'ui/StatusBadge';
import { buildRows, wrapIndex } from './buildRows';
import { createHighlightCache } from './highlightCache';
import DiffRow from './DiffRow';

const SpecDiffModal = ({ specDrift, onClose }) => {
  const virtuosoRef = useRef(null);

  const [cache] = useState(createHighlightCache);
  const [isRendering, setIsRendering] = useState(true);
  const [parseError, setParseError] = useState(false);
  const [rows, setRows] = useState([]);
  const [changeBlocks, setChangeBlocks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const addedCount = specDrift?.added?.length || 0;
  const modifiedCount = specDrift?.modified?.length || 0;
  const removedCount = specDrift?.removed?.length || 0;

  const versionLabel = specDrift?.versionChanged
    ? `v${specDrift.storedVersion || '?'} → v${specDrift.newVersion}`
    : null;

  // Parse + build row list, deferred via setTimeout so the spinner paints first.
  useEffect(() => {
    const { Diff2Html } = window;
    if (!Diff2Html || !specDrift?.unifiedDiff) {
      setIsRendering(false);
      return;
    }
    setIsRendering(true);
    setParseError(false);
    // setTimeout yields to the browser so the spinner paints before parse blocks.
    const timer = setTimeout(() => {
      try {
        const parsed = Diff2Html.parse(specDrift.unifiedDiff, {
          outputFormat: 'side-by-side',
          matching: 'lines'
        });
        const built = buildRows(parsed);
        setRows(built.rows);
        setChangeBlocks(built.changeBlocks);
        setCurrentIndex(0);
        cache.clear();
      } catch (err) {
        console.error('SpecDiffModal: failed to parse unified diff', err);
        setParseError(true);
      }
      setIsRendering(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [specDrift?.unifiedDiff, cache]);

  const goToChange = (idx) => {
    if (!changeBlocks.length) return;
    const nextIndex = wrapIndex(idx, changeBlocks.length);
    const targetBlock = changeBlocks[nextIndex];
    const fromBlock = changeBlocks[currentIndex];
    const gap = fromBlock ? Math.abs(targetBlock.startIdx - fromBlock.startIdx) : 0;
    virtuosoRef.current?.scrollToIndex({
      index: targetBlock.startIdx,
      align: 'center',
      behavior: gap > 500 ? 'auto' : 'smooth'
    });
    setCurrentIndex(nextIndex);
  };

  const activeBlock = changeBlocks[currentIndex] || null;
  const renderItem = (index) => (
    <DiffRow
      row={rows[index]}
      active={!!activeBlock && index >= activeBlock.startIdx && index <= activeBlock.endIdx}
      cache={cache}
    />
  );

  const showNav = !!specDrift?.unifiedDiff && !parseError;
  const changeCount = changeBlocks.length;
  const counterLabel
    = changeCount === 0 ? 'No changes' : `${currentIndex + 1} of ${changeCount} changes`;

  return (
    <Modal size="xl" title="Spec Diff" hideFooter handleCancel={onClose}>
      <div className="spec-diff-modal">
        <div className="spec-diff-header">
          <div className="spec-diff-header-left">
            <div className="spec-diff-badges">
              <div>Endpoint Changes:</div>
              {modifiedCount > 0 && <StatusBadge status="warning">Updated: {modifiedCount}</StatusBadge>}
              {addedCount > 0 && <StatusBadge status="success">Added: {addedCount}</StatusBadge>}
              {removedCount > 0 && <StatusBadge status="danger">Removed: {removedCount}</StatusBadge>}
              {versionLabel && <StatusBadge>{versionLabel}</StatusBadge>}
            </div>

            <p className="spec-diff-subtitle">
              {specDrift?.storedSpecMissing
                ? 'The current spec file is missing. The full remote spec is shown below.'
                : 'Side-by-side diff of your current spec vs the updated spec from the spec URL.'}
            </p>
          </div>
          {showNav && (
            <div className="spec-diff-nav">
              <span className="spec-diff-nav-counter">{counterLabel}</span>
              <div className="spec-diff-nav-buttons">
                <button
                  type="button"
                  className="spec-diff-nav-btn"
                  onClick={() => goToChange(currentIndex - 1)}
                  disabled={changeCount === 0}
                  title="Previous change"
                >
                  <IconChevronUp size={14} strokeWidth={1.75} /> Previous
                </button>
                <button
                  type="button"
                  className="spec-diff-nav-btn"
                  onClick={() => goToChange(currentIndex + 1)}
                  disabled={changeCount === 0}
                  title="Next change"
                >
                  <IconChevronDown size={14} strokeWidth={1.75} /> Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="spec-diff-body">
          <div className="text-diff-container">
            {specDrift?.unifiedDiff ? (
              <>
                <div className="diff-column-headers">
                  <span className="diff-column-label">
                    {specDrift?.storedSpecMissing ? 'Current Spec (missing)' : 'Current Spec'}
                  </span>
                  <span className="diff-column-label">Updated Spec</span>
                </div>
                {isRendering && (
                  <div className="text-diff-loading">
                    <IconLoader2 className="animate-spin" size={20} strokeWidth={1.5} />
                    <span>Loading diff...</span>
                  </div>
                )}
                {!isRendering && parseError && (
                  <div className="text-diff-empty">
                    Diff couldn&apos;t be rendered. Please file an issue with the spec.
                  </div>
                )}
                {!isRendering && !parseError && rows.length > 0 && (
                  <Virtuoso
                    ref={virtuosoRef}
                    totalCount={rows.length}
                    itemContent={renderItem}
                    // Must match .diff-row min-height in OpenAPISyncTab/StyledWrapper.js
                    fixedItemHeight={18}
                    increaseViewportBy={400}
                    style={{ height: '100%' }}
                  />
                )}
                {!isRendering && !parseError && rows.length === 0 && (
                  <div className="text-diff-empty">No changes to display.</div>
                )}
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

export default SpecDiffModal;
