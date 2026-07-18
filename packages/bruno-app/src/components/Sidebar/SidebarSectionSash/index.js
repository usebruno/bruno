import { useRef, useState } from 'react';
import StyledWrapper from './StyledWrapper';

const SidebarSectionSash = ({ onDragStart, onDrag, onDragEnd }) => {
  const startYRef = useRef(0);
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = (e) => {
    e.preventDefault();
    startYRef.current = e.clientY;
    setDragging(true);
    onDragStart?.();

    const handleMove = (ev) => {
      ev.preventDefault();
      onDrag?.(ev.clientY - startYRef.current);
    };
    const handleUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      onDragEnd?.();
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  return (
    <StyledWrapper
      className={`sidebar-section-sash ${dragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
    />
  );
};

export default SidebarSectionSash;
