const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const calendarDaysBetween = (earlier, later) => Math.round((startOfDay(later) - startOfDay(earlier)) / DAY);

export const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const elapsed = now.getTime() - timestamp;
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
  const daysAgo = calendarDaysBetween(date, now);
  if (daysAgo <= 1) {
    return 'yesterday';
  }
  if (daysAgo < 7) {
    return `${daysAgo}d ago`;
  }
  if (daysAgo < 30) {
    return `${Math.floor(daysAgo / 7)}w ago`;
  }
  const monthAndDay = { month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', date.getFullYear() === now.getFullYear() ? monthAndDay : { ...monthAndDay, year: 'numeric' });
};
