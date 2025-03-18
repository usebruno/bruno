import platform from 'platform';
import path from 'path';

const isWindowsOS = () => {
    const os = platform.os;
    const osFamily = os.family.toLowerCase();
    return osFamily.includes('windows');
};

const brunoPath = isWindowsOS() ? path.win32 : path.posix;

export default brunoPath;
