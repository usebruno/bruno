import { formatRelativeTime } from './relative-time';

const NOW = new Date(2026, 10, 13, 12, 0);
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ago = (duration) => NOW.getTime() - duration;

describe('formatRelativeTime', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: NOW });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it.each([
    ['a time ahead of the clock', 'just now', ago(-5 * MINUTE)],
    ['30 seconds ago', 'just now', ago(30 * 1000)],
    ['5 minutes ago', '5m ago', ago(5 * MINUTE)],
    ['59 minutes ago', '59m ago', ago(59 * MINUTE)],
    ['3 hours ago', '3h ago', ago(3 * HOUR)],
    ['25 hours ago', 'yesterday', ago(25 * HOUR)],
    ['47 hours ago', 'yesterday', ago(47 * HOUR)],
    ['3 days ago', '3d ago', ago(3 * DAY)],
    ['13 days ago', '1w ago', ago(13 * DAY)],
    ['29 days ago', '4w ago', ago(29 * DAY)],
    ['an earlier day this year', 'Oct 3', new Date(2026, 9, 3).getTime()],
    ['a day in an earlier year', 'Oct 3, 2025', new Date(2025, 9, 3).getTime()]
  ])('shows %s as %s', (_description, shown, timestamp) => {
    expect(formatRelativeTime(timestamp)).toBe(shown);
  });
});
