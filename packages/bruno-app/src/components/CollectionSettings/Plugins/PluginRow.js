import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { IconGripVertical } from '@tabler/icons';

const DRAG_TYPE = 'bruno-plugin-row';

const STATUS_COPY = {
  loaded: { dot: 'green', label: 'Loaded' },
  error: { dot: 'red', label: 'Error' },
  disabled: { dot: 'gray', label: 'Disabled' },
  unvalidated: { dot: 'muted', label: 'Not validated' }
};

const resolveStatus = (plugin, validationState) => {
  if (plugin.enabled === false) return 'disabled';
  const v = validationState?.[plugin.uid];
  if (!v) return 'unvalidated';
  return v.ok ? 'loaded' : 'error';
};

const PluginRow = ({
  plugin,
  index,
  isActive,
  validationState,
  onSelect,
  onMove
}) => {
  const ref = useRef(null);

  const [{ isOver }, drop] = useDrop({
    accept: DRAG_TYPE,
    hover(item) {
      if (item.uid === plugin.uid) return;
      onMove(item.uid, plugin.uid);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: DRAG_TYPE,
    item: { uid: plugin.uid, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    options: { dropEffect: 'move' }
  });

  dragPreview(drop(ref));

  const status = resolveStatus(plugin, validationState);
  const copy = STATUS_COPY[status];
  const validationError = validationState?.[plugin.uid]?.message;

  return (
    <li
      ref={ref}
      className={`plugin-row${isActive ? ' active' : ''}${isDragging ? ' dragging' : ''}${isOver ? ' drop-target' : ''}`}
      onClick={() => onSelect(plugin.uid)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(plugin.uid);
        }
      }}
    >
      <span
        ref={drag}
        className="plugin-grip"
        onClick={(e) => e.stopPropagation()}
        title="Drag to reorder"
      >
        <IconGripVertical size={14} strokeWidth={1.5} />
      </span>
      <span className={`plugin-status-dot dot-${copy.dot}`} aria-hidden="true" />
      <span className="plugin-row-body">
        <span className="plugin-row-name" title={plugin.name}>
          {plugin.name || '(unnamed)'}
        </span>
        <span className="plugin-row-sublabel" title={status === 'error' ? validationError : copy.label}>
          {copy.label}
        </span>
      </span>
    </li>
  );
};

export default PluginRow;
