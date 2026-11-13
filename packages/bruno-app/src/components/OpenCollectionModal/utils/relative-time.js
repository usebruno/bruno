const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const formatRelativeTime = (timestamp) => {
  const elapsed = Date.now() - timestamp;
  if (elapsed < MINUTE) {
    return 'just now';
  }
  if (elapsed < HOUR) {
    return `${Math.floor(elapsed / MINUTE)}m ago`;
  }
  if (elapsed < DAY) {
    return `${Math.floor(elapsed / HOUR)}h ago`;
  }
  if (elapsed < 2 * DAY) {
    return 'yesterday';
  }
  if (elapsed < 7 * DAY) {
    return `${Math.floor(elapsed / DAY)}d ago`;
  }
  if (elapsed < 30 * DAY) {
    return `${Math.floor(elapsed / (7 * DAY))}w ago`;
  }
  const date = new Date(timestamp);
  const monthAndDay = { month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', date.getFullYear() === new Date().getFullYear() ? monthAndDay : { ...monthAndDay, year: 'numeric' });
};
