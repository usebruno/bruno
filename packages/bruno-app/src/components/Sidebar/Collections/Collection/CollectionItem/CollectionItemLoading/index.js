import { useSelector } from "react-redux";
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';
import { IconChevronRight, IconLoader2 } from '@tabler/icons';

const CollectionItemLoading = ({ collection, onClick }) => {
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  const itemRowClassName = classnames('flex collection-item-name items-center', {
    // 'item-focused-in-tab': item.uid == activeTabUid,
    // 'item-hovered': isOver
  });

  return (
    <StyledWrapper onClick={onClick}>
      <div className="flex py-1 collection-name items-center relative opacity-70">
        <IconChevronRight
          size={16}
          strokeWidth={2}
          style={{ color: 'rgb(160 160 160)' }}
        />
        <div className="flex items-center h-full w-full ml-1">
          {collection?.name}
          <IconLoader2 className="animate-spin absolute right-2 top-1" size={15} strokeWidth={1.5} />
        </div>
      </div>
    </StyledWrapper>
  );
}

export default CollectionItemLoading;