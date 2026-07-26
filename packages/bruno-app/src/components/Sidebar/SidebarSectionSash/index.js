import { useEffect, useRef, useState } from 'react';
import StyledWrapper from './StyledWrapper';

const SidebarSectionSash = ({ onDragStart, onDrag, onDragEnd }) => {
  const startYRef = useRef(0);
  const listenersRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const teardown = () => {
    if (!listenersRef.current) return;
    document.removeEventListener('mousemove', listenersRef.current.move);
    document.removeEventListener('mouseup', listenersRef.current.up);
    listenersRef.current = null;
  };

  // Remove any still-attached drag listeners if the sash unmounts mid-drag.
  useEffect(() => teardown, []);

  const handleMouseDown = (e) => {
    e.preventDefault();
    startYRef.current = e.clientY;
    setDragging(true);
    onDragStart?.();

    const move = (ev) => {
      ev.preventDefault();
      onDrag?.(ev.clientY - startYRef.current);
    };
    const up = () => {
      setDragging(false);
      teardown();
      onDragEnd?.();
    };
    listenersRef.current = { move, up };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  return (
    <StyledWrapper
      className={`sidebar-section-sash ${dragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
    />
  );
};

export default SidebarSectionSash;
