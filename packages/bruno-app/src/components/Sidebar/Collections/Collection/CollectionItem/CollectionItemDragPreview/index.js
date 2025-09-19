import { useDragLayer } from 'react-dnd';
import {
  IconFile,
  IconFolder,
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
    zIndex: 100,
  };
}

export const CollectionItemDragPreview = () => {
  const {
    item,
    isDragging,
    clientOffset
  } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    isDragging: monitor.isDragging(),
    clientOffset: monitor.getClientOffset(),
  }));
  if (!isDragging) return null;
  if (!item.type) return null;
  const { x, y } = clientOffset || {};
  const shouldShowFolderIcon = item.type === 'folder';
  return (
    <StyledWrapper>
      <div style={getItemStyles({ x, y })} className='p-2'>
        <div className='flex items-center gap-2 border border-gray-500/10 rounded-md px-2 py-1 drag-preview'>
          {shouldShowFolderIcon ? (
            <IconFolder size={16} />
          ) : (
            <IconFile size={16} />
          )}
          {item.name}
        </div>
      </div>
    </StyledWrapper>
  );
};
