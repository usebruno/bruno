import { tildify } from './collection-location';

describe('tildify', () => {
  it.each([
    ['/Users/me/work/api', '~/work/api'],
    ['/home/me/work', '~/work'],
    ['C:\\Users\\me\\work', '~/work'],
    ['/opt/work', '/opt/work'],
    ['/', '/']
  ])('shows %s as %s', (pathname, shown) => {
    expect(tildify(pathname)).toBe(shown);
  });
});
