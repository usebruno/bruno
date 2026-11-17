const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const isYesterday = (date) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
};

export const formatRelativeTime = (timestamp) => {
  const elapsed = Date.now() - timestamp;
  const date = new Date(timestamp);
  if (elapsed < MINUTE) {
    return 'just now';
  }
  if (elapsed < HOUR) {
    return `${Math.floor(elapsed / MINUTE)}m ago`;
  }
  if (elapsed < DAY) {
    return `${Math.floor(elapsed / HOUR)}h ago`;
  }
  if (isYesterday(date)) {
    return 'yesterday';
  }
  if (elapsed < 7 * DAY) {
    return `${Math.floor(elapsed / DAY)}d ago`;
  }
  if (elapsed < 30 * DAY) {
    return `${Math.floor(elapsed / (7 * DAY))}w ago`;
  }
  const monthAndDay = { month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', date.getFullYear() === new Date().getFullYear() ? monthAndDay : { ...monthAndDay, year: 'numeric' });
};
