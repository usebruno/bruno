import { formatParentPath } from './utils';

describe('formatParentPath', () => {
  it.each([
    ['/Users/me/work/payments', 'payments', '~/work'],
    ['/Users/me/work/payments', 'Payments', '~/work/payments'],
    ['/Users/me/a/b/c/d/api', 'api', '~/a/b/c/d'],
    ['/Users/me/work/acme/apis/v2/payments/core', 'core', '~/work/…/v2/payments'],
    ['/srv/apis/billing', 'billing', '/srv/apis'],
    ['/api', 'api', '/'],
    ['C:\\Users\\me\\work\\api', 'api', '~/work'],
    ['D:\\apis\\billing', 'billing', 'D:/apis'],
    ['\\\\server\\share\\api', 'api', '//server/share'],
    ['\\\\nas\\team\\bruno\\payments\\api', 'api', '//nas/team/bruno/payments'],
    ['\\\\nas\\team\\a\\b\\bruno\\payments\\api', 'api', '//nas/team/…/bruno/payments'],
    ['\\\\wsl.localhost\\Ubuntu\\home\\me\\work\\api', 'api', '//wsl.localhost/Ubuntu/home/me/work']
  ])('shows %s named %s as %s', (pathname, name, shown) => {
    expect(formatParentPath(pathname, name)).toBe(shown);
  });
});
