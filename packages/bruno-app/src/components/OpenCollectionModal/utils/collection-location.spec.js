import { getLocationInFolders, tildify } from './collection-location';

describe('getLocationInFolders', () => {
  it('gives the path inside the picked folder that holds the collection', () => {
    expect(getLocationInFolders(['/work', '/shop'], '/shop/api/orders')).toBe('api/orders');
  });

  it('names a collection that was picked directly by its folder', () => {
    expect(getLocationInFolders(['/work/orders'], '/work/orders')).toBe('orders');
  });

  it('names a collection by its folder when the picked folder is the disk root', () => {
    expect(getLocationInFolders(['/'], '/work/api/orders')).toBe('orders');
  });

  it('reads Windows paths', () => {
    expect(getLocationInFolders(['C:\\work'], 'C:\\work\\api\\orders')).toBe('api/orders');
  });
});

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
