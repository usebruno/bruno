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

// Builds the "N folders, M requests and K apps"-style summary for a multi-item drag.
function getMultiDragLabel(multiSelectedItems) {
  const folders = multiSelectedItems.filter((i) => i.type === 'folder').length;
  const apps = multiSelectedItems.filter((i) => i.type === 'app').length;
  const requests = multiSelectedItems.filter((i) => i.type && i.type.includes('request')).length;
  const collections = multiSelectedItems.filter((i) => !i.type || i.type === 'collection').length;

  const parts = [];
  if (collections > 0) parts.push(`${collections} collection${collections > 1 ? 's' : ''}`);
  if (folders > 0) parts.push(`${folders} folder${folders > 1 ? 's' : ''}`);
  if (apps > 0) parts.push(`${apps} app${apps > 1 ? 's' : ''}`);
  if (requests > 0) parts.push(`${requests} request${requests > 1 ? 's' : ''}`);

  if (parts.length === 0) return `${multiSelectedItems.length} items`;
  return parts.join(', ').replace(/, ([^,]*)$/, ' and $1');
}

function getSingleDragIcon(itemType, itemData) {
  if (itemType === 'collection' || (!itemData.type && itemData.pathname)) return IconBook;
  if (itemData.type === 'folder') return IconFolder;
  if (itemData.type === 'app') return IconFile;
  return IconFile;
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
    label = getMultiDragLabel(item.multiSelectedItems);
    Icon = null;
  } else {
    // A drag payload for exactly one multi-selected item still carries multiSelectedItems —
    // resolve the label/icon from that entry rather than the (possibly stale) top-level item.
    const currentItemData = multiCount === 1 ? item.multiSelectedItems[0] : item;
    const currentItemType = multiCount === 1 && currentItemData.type ? currentItemData.type : itemType;
    label = currentItemData.name;
    Icon = getSingleDragIcon(currentItemType, currentItemData);
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
