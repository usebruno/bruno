import classnames from 'classnames';
import { relativeDate } from 'utils/common';

const NotificationList = ({ items, selectedId, onSelect }) => {
  return (
    <ul className="notif-list">
      {items.map((notification) => {
        const isActive = selectedId === notification.id;
        const isUnread = !notification.read;
        return (
          <li
            key={notification.id}
            className={classnames('notif-list-item', { active: isActive, unread: isUnread })}
            onClick={() => onSelect(notification)}
          >
            <div className={classnames('notif-item-title', { unread: isUnread })}>{notification.title}</div>
            <div className="notif-item-date">{relativeDate(notification.date)}</div>
          </li>
        );
      })}
      {items.length === 0 && <li className="notif-list-empty">No notifications to show.</li>}
    </ul>
  );
};

export default NotificationList;
