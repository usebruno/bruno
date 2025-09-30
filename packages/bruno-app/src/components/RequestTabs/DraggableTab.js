import React from 'react';
import { useDrag, useDrop } from 'react-dnd';

const DraggableTab = ({ id, moveTab, index, children, className }) => {
  const ref = React.useRef(null);

  const [{ handlerId }, drop] = useDrop({
    accept: 'tab',
    hover(item) {
      if (item.id === id) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) {
        return;
      }
      moveTab(item.id, id);
      item.index = id;
    },
    canDrop: (draggedItem) => {
      return draggedItem.index !== index;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      handlerId: monitor.getHandlerId()
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
      style={{ opacity: isDragging ? 0 : 1 }}
      data-handler-id={handlerId}
    >
      {children}
    </li>
  );
};

export default DraggableTab;
