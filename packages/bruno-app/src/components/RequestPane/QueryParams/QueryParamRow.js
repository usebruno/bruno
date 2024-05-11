import { React, useMemo, useState, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import SingleLineEditor from 'components/SingleLineEditor';
import { IconLineHeight, IconTrash } from '@tabler/icons';
import { useTheme } from 'providers/Theme';

const DRAG_ACCEPT = 'QueryParamRow';

export const QueryParamRow = ({
  param,
  index,
  collection,
  onSave,
  onRun,
  onChangeEvent,
  onTrashEvent,
  onDragEvent
}) => {
  const { storedTheme } = useTheme();
  const draggableRef = useRef(null);

  const [{ handlerId }, drop] = useDrop({
    accept: DRAG_ACCEPT,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId()
      };
    },
    hover(item, monitor) {
      if (!draggableRef.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine mouse position and rectangle on screen
      const hoverBoundingRect = draggableRef.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      console.log(`hoverIndex=${hoverIndex}, dragIndex=${dragIndex}`);

      // Trigger callback
      onDragEvent(dragIndex, hoverIndex);

      item.index = hoverIndex;
    }
  });
  const [{ isDragging }, drag] = useDrag({
    type: DRAG_ACCEPT,
    item: () => {
      return { index, param };
    },
    collect: (monitor) => ({
      isDragging: param.uid === monitor.getItem()?.param?.uid
    })
  });
  const getClassNames = () => {
    return isDragging ? 'dragging select-none clip-codemirror' : 'select-text clip-codemirror';
  };

  drag(drop(draggableRef));
  return (
    <tr key={param.uid} className={getClassNames()} ref={draggableRef} data-handler-id={handlerId}>
      <td className="draggable-handle text-right !p-0 !p-0 select-none">
        <div className="w-full flex place-content-center">
          <IconLineHeight strokeWidth={1.5} size={20} />
        </div>
      </td>
      <td>
        <input
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          value={param.name}
          className="mousetrap"
          onChange={(e) => onChangeEvent(e, param, 'name')}
        />
      </td>
      <td>
        <SingleLineEditor
          value={param.value}
          theme={storedTheme}
          onSave={() => onSave()}
          onChange={(newValue) =>
            onChangeEvent(
              {
                target: {
                  value: newValue
                }
              },
              param,
              'value'
            )
          }
          onRun={() => onRun()}
          collection={collection}
        />
      </td>
      <td>
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={param.enabled}
            tabIndex="-1"
            className="mr-3 mousetrap"
            onChange={(e) => onChangeEvent(e, param, 'enabled')}
          />
          <button tabIndex="-1" onClick={() => onTrashEvent(param)}>
            <IconTrash strokeWidth={1.5} size={20} />
          </button>
        </div>
      </td>
    </tr>
  );
};
