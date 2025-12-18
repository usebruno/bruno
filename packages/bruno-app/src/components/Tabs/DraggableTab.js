import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';

const DraggableTab = ({
  id,
  index,
  type = 'tab',
  onMoveTab,
  children,
  className,
  onClick
}) => {
  const ref = useRef(null);

  const [{ handlerId, isOver }, drop] = useDrop({
    accept: type,
    hover(item) {
      if (onMoveTab) {
        onMoveTab(item.id, id);
      }
    },
    collect: (monitor) => ({
      handlerId: monitor.getHandlerId(),
      isOver: monitor.isOver()
    })
  });

  const [{ isDragging }, drag] = useDrag({
    type,
    item: () => ({ id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    options: {
      dropEffect: 'move'
    }
  });

  drag(drop(ref));

  return (
    <li
      className={className}
      ref={ref}
      role="tab"
      style={{ opacity: isDragging || isOver ? 0 : 1 }}
      onClick={onClick}
      data-handler-id={handlerId}
    >
      {children}
    </li>
  );
};

export default DraggableTab;
