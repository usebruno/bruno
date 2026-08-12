import React, { useCallback, useRef, useState } from 'react';
import StyledWrapper from './StyledWrapper';

const COMPACT_WIDTH_THRESHOLD = 150;

const VarValueCell = ({ editor, renderTypeSelector, trailingContent, onCompactChange }) => {
  const [compact, setCompact] = useState(true);
  const [hovered, setHovered] = useState(false);
  const observerRef = useRef(null);

  const containerRef = useCallback((node) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      observerRef.current = new ResizeObserver(([entry]) => {
        const isCompact = entry.contentRect.width < COMPACT_WIDTH_THRESHOLD;
        setCompact(isCompact);
        onCompactChange?.(isCompact);
      });
      observerRef.current.observe(node);
    }
  }, [onCompactChange]);

  const typeSelectorOverlay = renderTypeSelector && compact ? (
    <div
      className="type-selector-overlay"
      style={{ pointerEvents: hovered ? 'auto' : 'none' }}
    >
      {renderTypeSelector({ compact: true })}
    </div>
  ) : null;

  return (
    <StyledWrapper
      ref={containerRef}
      className={`relative flex items-center w-full${compact ? ' var-value-compact' : ' gap-2'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ flex: '1 1 0', minWidth: 0 }}>
        {editor}
      </div>
      {compact && trailingContent ? (
        <div className="trailing-area">
          {typeSelectorOverlay}
          {trailingContent}
        </div>
      ) : (
        <>
          {typeSelectorOverlay}
          {!compact && renderTypeSelector && renderTypeSelector({ compact: false })}
          {trailingContent && (
            <div className="trailing-area">
              {typeSelectorOverlay}
              {trailingContent}
            </div>
          )}
        </>
      )}
    </StyledWrapper>
  );
};

export default VarValueCell;
