import { React, useRef } from 'react';
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
  const ref = useRef(null);

  const [{ handlerId }, drop] = useDrop({
    accept: DRAG_ACCEPT,
    collect: (monitor) => ({ handlerId: monitor.getHandlerId() }),
    hover: (item, monitor) => {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;
      // Don't replace items with themselves
      if (item.index === index) return;
      // Determine grab and hover rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      // Trigger callback and override index
      onDragEvent(item.index, index);
      item.index = index;
    }
  });
  const [{ isDragging }, drag] = useDrag({
    type: DRAG_ACCEPT,
    item: () => ({ index, param }),
    collect: (monitor) => ({
      isDragging: param.uid === monitor.getItem()?.param?.uid
    })
  });
  const getClassNames = () => {
    return isDragging ? 'dragging select-none clip-codemirror' : 'select-text clip-codemirror';
  };

  drag(drop(ref));
  return (
    <tr key={param.uid} className={getClassNames()} ref={ref} data-handler-id={handlerId}>
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
      <td className="!p-0 !m-0">
        <div className="flex justify-evenly w-full">
          <input
            type="checkbox"
            checked={param.enabled}
            tabIndex="-1"
            className="mousetrap"
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
