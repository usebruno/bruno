import { useDragLayer } from 'react-dnd';
import {
  IconFile,
  IconFolder,
  IconBook
} from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

function getItemStyles({ x, y }) {
  if (Number.isNaN(x) || Number.isNaN(y)) return { display: 'none' };
  const transform = `translate(${x}px, ${y}px)`;

  return {
    position: 'fixed',
    pointerEvents: 'none',
    top: 0,
    transform,
    WebkitTransform: transform,
    zIndex: 100
  };
}

export const CollectionItemDragPreview = () => {
  const {
    item,
    itemType,
    isDragging,
    clientOffset
  } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    isDragging: monitor.isDragging(),
    clientOffset: monitor.getClientOffset()
  }));

  if (!isDragging) return null;
  if (!item) return null;

  const validTypes = ['collection', 'collection-item', 'disabled-drag'];
  if (!validTypes.includes(itemType)) return null;

  const { x, y } = clientOffset || {};
  const multiCount = item.multiSelectedItems?.length;

  let label = item.name;
  let Icon = IconFile;

  if (multiCount > 1) {
    label = `${multiCount} items`;
    Icon = null;
  } else if (itemType === 'collection' || (!item.type && item.pathname)) {
    Icon = IconBook;
  } else if (item.type === 'folder') {
    Icon = IconFolder;
  }

  return (
    <StyledWrapper>
      <div style={getItemStyles({ x, y })} className="p-2">
        <div className="flex items-center gap-2 border border-gray-500/10 rounded-md px-2 py-1 drag-preview">
          {Icon && <Icon size={16} />}
          {label}
        </div>
      </div>
    </StyledWrapper>
  );
};
