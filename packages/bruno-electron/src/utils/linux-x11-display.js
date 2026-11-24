const OZONE_FLAG = '--ozone-platform=x11';

/**
 * Decide whether to relaunch under X11 on Wayland.
 * Returns null to continue startup, or { execPath, args } for app.relaunch.
 */
const decideX11Relaunch = ({
  platform,
  env = {},
  hasOzonePlatformSwitch = false,
  argv = [],
  execPath
}) => {
  if (platform !== 'linux') {
    return null;
  }
  if (!env.WAYLAND_DISPLAY || !env.DISPLAY) {
    return null;
  }
  if (hasOzonePlatformSwitch) {
    return null;
  }
  if (env.BRUNO_USE_X11 !== '1') {
    return null;
  }

  const args = argv.slice(1);
  const alreadyHasOzone = args.some(
    (arg) => arg === OZONE_FLAG || arg === '--ozone-platform' || arg.startsWith('--ozone-platform=')
  );
  if (!alreadyHasOzone) {
    args.push(OZONE_FLAG);
  }

  return {
    execPath: env.APPIMAGE || execPath,
    args
  };
};

const applyX11RelaunchIfNeeded = (app) => {
  const decision = decideX11Relaunch({
    platform: process.platform,
    env: process.env,
    hasOzonePlatformSwitch: app.commandLine.hasSwitch('ozone-platform'),
    argv: process.argv,
    execPath: process.execPath
  });

  if (!decision) {
    return false;
  }

  app.relaunch({ execPath: decision.execPath, args: decision.args });
  app.exit(0);
  return true;
};

module.exports = {
  decideX11Relaunch,
  applyX11RelaunchIfNeeded
};
