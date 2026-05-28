import DOMPurify from 'dompurify';
import { useTheme } from 'providers/Theme';
import { humanizeDate } from 'utils/common';

const TYPE_VARIANT_MAP = {
  'security': 'danger',
  'release': 'info',
  'tip': 'success',
  'announcement': 'warning',
  'new-feature': 'warning'
};

const HASH_BUCKETS = ['info', 'success', 'warning', 'danger'];

const hashString = (str) => str.toLowerCase().slice(0, 6).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

const getBadgeStyle = (typeId, theme) => {
  const variant = TYPE_VARIANT_MAP[typeId] ?? HASH_BUCKETS[hashString(typeId) % HASH_BUCKETS.length];
  return {
    backgroundColor: theme.status[variant].background,
    color: theme.status[variant].text
  };
};

const getSanitizedDescription = (description) => {
  return DOMPurify.sanitize(description || '', {
    ALLOWED_TAGS: ['a', 'ul', 'img', 'li', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'strong', 'em'],
    ALLOWED_ATTR: ['href', 'style', 'target', 'src', 'alt']
  });
};

const NotificationDetail = ({ notification }) => {
  const { theme } = useTheme();

  // Rendered in a sandboxed iframe (no allow-scripts); theme CSS is inlined
  // since the iframe doesn't inherit app styles.
  const buildDescriptionDocument = (description) => {
    const body = getSanitizedDescription(description);
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <base target="_blank" />
    <style>
      html, body { margin: 0; padding: 0; background: ${theme.background.base}; }
      body {
        padding: 8px 12px;
        font-family: Inter, sans-serif;
        font-size: 12px;
        line-height: 20px;
        font-weight: 500;
        color: ${theme.colors.text.muted};
        word-break: break-word;
      }
      p { margin: 0 0 0.75rem 0; }
      a { color: ${theme.textLink}; text-decoration: underline; }
      h1, h2, h3, h4, h5, h6 { font-size: 13px; font-weight: 600; margin: 0 0 0.5rem 0; color: ${theme.text}; }
      ul { padding-left: 1.25rem; margin: 0 0 0.75rem 0; }
      img { max-width: 100%; }
    </style>
  </head>
  <body>${body}</body>
</html>`;
  };

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
            <span className="notif-type-badge" style={getBadgeStyle(notification.typeId ?? notification.type, theme)}>
              {notification.type}
            </span>
          )}
          <span className="notif-detail-date">{humanizeDate(notification.date)}</span>
        </div>
        <div className="notif-detail-title">{notification.title}</div>
      </div>
      <iframe
        className="notif-detail-body"
        title="Notification details"
        sandbox="allow-popups"
        srcDoc={buildDescriptionDocument(notification.description)}
      />
    </div>
  );
};

export default NotificationDetail;
