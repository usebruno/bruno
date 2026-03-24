import React, { useRef, useCallback } from 'react';
import { IconChevronDown, IconChevronUp } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const CollapsedPanelIndicator = ({
  panelType, // 'request' or 'response'
  isVertical,
  onExpand,
  onDragStart,
  dragThresholdPx
}) => {
  const dragThresholdSq = dragThresholdPx * dragThresholdPx; // to use in distance check
  const label = panelType === 'request' ? 'Request' : 'Response';

  const ChevronIcon = panelType === 'request' ? IconChevronDown : IconChevronUp;

  const pointerDownRef = useRef(null);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!pointerDownRef.current) return;
    const dx = e.clientX - pointerDownRef.current.x;
    const dy = e.clientY - pointerDownRef.current.y;
    if (dx * dx + dy * dy > dragThresholdSq) {
      pointerDownRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      onDragStart?.(e);
    }
  }, [onDragStart, dragThresholdSq]);

  const handlePointerUp = useCallback((e) => {
    if (!pointerDownRef.current) return;
    pointerDownRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    onExpand();
  }, [onExpand]);

  const handlePointerCancel = useCallback((e) => {
    if (!pointerDownRef.current) return;
    pointerDownRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onExpand();
    }
  }, [onExpand]);

  return (
    <StyledWrapper
      className={`collapsed-panel-indicator ${isVertical ? 'vertical' : 'horizontal'} ${panelType}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`Expand ${label} pane`}
      title={`Click to expand ${label} pane, or drag to resize`}
    >
      <div className="indicator-content">
        <ChevronIcon size={14} strokeWidth={2} className="expand-icon" />
        <span className="panel-label">{label}</span>
      </div>
    </StyledWrapper>
  );
};

export default CollapsedPanelIndicator;
