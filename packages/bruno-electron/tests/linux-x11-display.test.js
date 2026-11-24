const { decideX11Relaunch } = require('../src/utils/linux-x11-display');

const base = {
  platform: 'linux',
  env: {
    WAYLAND_DISPLAY: 'wayland-0',
    DISPLAY: ':0'
  },
  hasOzonePlatformSwitch: false,
  argv: ['/usr/bin/electron', '.'],
  execPath: '/usr/bin/electron'
};

describe('decideX11Relaunch', () => {
  test('returns null by default (no opt-in)', () => {
    expect(decideX11Relaunch(base)).toBeNull();
  });

  test('returns null on non-linux', () => {
    expect(
      decideX11Relaunch({
        ...base,
        platform: 'darwin',
        env: { ...base.env, BRUNO_USE_X11: '1' }
      })
    ).toBeNull();
  });

  test('returns null without WAYLAND_DISPLAY', () => {
    expect(
      decideX11Relaunch({
        ...base,
        env: { DISPLAY: ':0', BRUNO_USE_X11: '1' }
      })
    ).toBeNull();
  });

  test('returns null without DISPLAY (no XWayland)', () => {
    expect(
      decideX11Relaunch({
        ...base,
        env: { WAYLAND_DISPLAY: 'wayland-0', BRUNO_USE_X11: '1' }
      })
    ).toBeNull();
  });

  test('returns null when ozone-platform switch is already set', () => {
    expect(
      decideX11Relaunch({
        ...base,
        hasOzonePlatformSwitch: true,
        env: { ...base.env, BRUNO_USE_X11: '1' }
      })
    ).toBeNull();
  });

  test('relaunches when BRUNO_USE_X11=1', () => {
    expect(
      decideX11Relaunch({
        ...base,
        env: { ...base.env, BRUNO_USE_X11: '1' }
      })
    ).toEqual({
      execPath: '/usr/bin/electron',
      args: ['.', '--ozone-platform=x11']
    });
  });

  test('prefers APPIMAGE exec path', () => {
    expect(
      decideX11Relaunch({
        ...base,
        env: {
          ...base.env,
          BRUNO_USE_X11: '1',
          APPIMAGE: '/home/user/Bruno.AppImage'
        }
      })
    ).toEqual({
      execPath: '/home/user/Bruno.AppImage',
      args: ['.', '--ozone-platform=x11']
    });
  });

  test('preserves existing argv flags (dev inspect)', () => {
    expect(
      decideX11Relaunch({
        ...base,
        env: { ...base.env, BRUNO_USE_X11: '1' },
        argv: ['/usr/bin/electron', '/path/to/bruno-electron', '--inspect=9229']
      })
    ).toEqual({
      execPath: '/usr/bin/electron',
      args: ['/path/to/bruno-electron', '--inspect=9229', '--ozone-platform=x11']
    });
  });

  test('does not duplicate ozone flag already present in argv', () => {
    expect(
      decideX11Relaunch({
        ...base,
        env: { ...base.env, BRUNO_USE_X11: '1' },
        argv: ['/usr/bin/electron', '.', '--ozone-platform=x11']
      })
    ).toEqual({
      execPath: '/usr/bin/electron',
      args: ['.', '--ozone-platform=x11']
    });
  });
});
