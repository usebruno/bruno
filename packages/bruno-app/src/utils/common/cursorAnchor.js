// Tippy positions against a child element, so a cursor-anchored popup needs a 1px marker at the point.
export const cursorAnchorStyle = (point) => ({
  position: 'fixed',
  left: `${point?.x || 0}px`,
  top: `${point?.y || 0}px`,
  width: '1px',
  height: '1px',
  pointerEvents: 'none'
});
