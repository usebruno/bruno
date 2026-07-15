import React from 'react';
import { parseToRgb, rgba } from 'polished';
import { useTheme } from 'providers/Theme';
import { humanizeDate } from 'utils/common';

// Markdown pulls in markdown-it (~180 kB) — lazy loaded so it stays out of the
// main bundle (this file is reachable from the eagerly-loaded Notifications).
const Markdown = React.lazy(() => import('components/MarkDown'));

// color may be any CSS color (hex, rgb, hsl): solid text on a 15% tinted bg.
// Falls back to the theme's purple when the supplied color can't be parsed.
export const getBadgeStyle = (color, theme) => {
  let badgeColor = theme.colors.text.purple;
  try {
    parseToRgb(color);
    badgeColor = color;
  } catch {
    // invalid color; keep the fallback
  }
  return {
    backgroundColor: rgba(badgeColor, 0.15),
    color: badgeColor
  };
};

const NotificationDetail = ({ notification }) => {
  const { theme } = useTheme();

  if (!notification) {
    return (
      <div className="notif-detail">
        <div className="notif-empty">Select a notification to read more.</div>
      </div>
    );
  }

  return (
    <div className="notif-detail">
      <div className="notif-detail-header">
        <div className="notif-detail-meta">
          {notification.type && (
            <span className="notif-type-badge" style={getBadgeStyle(notification.color, theme)}>
              {notification.type}
            </span>
          )}
          <span className="notif-detail-date">{humanizeDate(notification.date)}</span>
        </div>
        <div className="notif-detail-title">{notification.title}</div>
      </div>
      <div key={notification.id} className="notif-detail-body">
        <React.Suspense fallback={null}>
          <Markdown content={notification.description} allowHtml={false} onDoubleClick={() => {}} />
        </React.Suspense>
      </div>
    </div>
  );
};

export default NotificationDetail;
