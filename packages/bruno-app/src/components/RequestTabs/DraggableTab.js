import React from 'react';
import { useDrag, useDrop } from 'react-dnd';

const DraggableTab = ({ id, onMoveTab, index, children, className }) => {
  const ref = React.useRef(null);

  const [{ handlerId, isOver }, drop] = useDrop({
    accept: 'tab',
    hover(item, monitor) {
      onMoveTab(item.id, id);
    },
    collect: (monitor) => ({
      handlerId: monitor.getHandlerId(),
      isOver: monitor.isOver()
    })
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'tab',
    item: () => {
      return { id, index };
    },
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
      style={{ opacity: isDragging || isOver ? 0 : 1 }}
      data-handler-id={handlerId}
    >
      {children}
    </li>
  );
};

export default DraggableTab;
