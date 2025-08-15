import platform from 'platform';
import path from 'path';

const isWindowsOS = () => {
  const os = platform.os;
  const osFamily = os.family.toLowerCase();
  return osFamily.includes('windows');
};

const brunoPath = isWindowsOS() ? path.win32 : path.posix;

export default brunoPath;

export function normalizePath(p) {
  if (!p) return p;

  // is a WSL path
  if (p.startsWith('\\\\wsl.localhost\\') || p.startsWith('\\wsl.localhost\\') ||
    p.startsWith('/wsl.localhost/') || p.startsWith('//wsl.localhost/')) {
    if (p.startsWith('/wsl.localhost/')) {
      return p.replace(/^\/wsl.localhost/, '\\\\wsl.localhost').replace(/\//g, '\\');
    }
    if (p.startsWith('//wsl.localhost/')) {
      return p.replace(/^\/\/wsl.localhost/, '\\\\wsl.localhost').replace(/\//g, '\\');
    }
    if (p.startsWith('\\wsl.localhost\\')) {
      return p.replace(/^\\wsl.localhost/, '\\\\wsl.localhost');
    }
    // return if already in correct format
    return p;
  }
  return p.replace(/\\\\|\\/g, '/');
}