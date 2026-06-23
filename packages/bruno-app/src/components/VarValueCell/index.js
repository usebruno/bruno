import React, { useCallback, useRef, useState } from 'react';
import StyledWrapper from './StyledWrapper';

const COMPACT_WIDTH_THRESHOLD = 150;

const VarValueCell = ({ editor, renderTypeSelector }) => {
  const [compact, setCompact] = useState(true);
  const observerRef = useRef(null);

  const containerRef = useCallback((node) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      observerRef.current = new ResizeObserver(([entry]) => {
        setCompact(entry.contentRect.width < COMPACT_WIDTH_THRESHOLD);
      });
      observerRef.current.observe(node);
    }
  }, []);

  return (
    <StyledWrapper
      ref={containerRef}
      className={`relative flex items-center w-full${compact ? ' var-value-compact' : ' gap-2'}`}
    >
      <div style={compact ? { width: '100%', minWidth: 0 } : { flex: '1 1 0', minWidth: 0 }}>
        {editor}
      </div>
      {renderTypeSelector && (
        compact
          ? <div className="type-selector-overlay">{renderTypeSelector({ compact: true })}</div>
          : renderTypeSelector({ compact: false })
      )}
    </StyledWrapper>
  );
};

export default VarValueCell;
