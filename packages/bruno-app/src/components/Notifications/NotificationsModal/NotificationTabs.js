import { IconDotsVertical } from '@tabler/icons';
import { useRef } from 'react';
import Dropdown from 'components/Dropdown';
import { TABS } from '../hooks/useNotifications';

const menuIcon = (
  <span className="notif-menu-trigger" aria-label="Notifications menu">
    <IconDotsVertical size={16} strokeWidth={1.5} />
  </span>
);

const NotificationTabs = ({ activeTab, unreadCount, onTabChange, onMarkAllRead, onClearAll }) => {
  const dropdownTippyRef = useRef(null);
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const hideDropdown = () => dropdownTippyRef.current?.hide();

  return (
    <div className="notif-tabs">
      <div className="notif-tab-group">
        <button
          type="button"
          className={`notif-tab ${activeTab === TABS.ALL ? 'active' : ''}`}
          onClick={() => onTabChange(TABS.ALL)}
        >
          All
        </button>
        <button
          type="button"
          className={`notif-tab ${activeTab === TABS.UNREAD ? 'active' : ''}`}
          onClick={() => onTabChange(TABS.UNREAD)}
        >
          Unread
          {unreadCount > 0 && <span className="notif-tab-badge">{unreadCount}</span>}
        </button>
      </div>
      <Dropdown icon={menuIcon} placement="bottom-end" onCreate={onDropdownCreate}>
        <div
          className={`dropdown-item ${unreadCount === 0 ? 'disabled' : ''}`}
          onClick={() => {
            if (unreadCount === 0) return;
            hideDropdown();
            onMarkAllRead();
          }}
        >
          Mark all as read
        </div>
        <div
          className="dropdown-item"
          onClick={() => {
            hideDropdown();
            onClearAll();
          }}
        >
          Clear all
        </div>
      </Dropdown>
    </div>
  );
};

export default NotificationTabs;
