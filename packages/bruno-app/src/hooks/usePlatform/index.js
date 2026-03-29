import { useState, useEffect } from 'react';

export const PlatformKind = Object.freeze({
  MacOS: 'macos',
  Windows: 'windows',
  Linux: 'linux'
});

export default function usePlatform() {
  const [platform, setPlatform] = useState(null);

  useEffect(() => {
    // use navigator to detect platform
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('mac')) {
      setPlatform(PlatformKind.MacOS);
    } else if (platform.includes('win')) {
      setPlatform(PlatformKind.Windows);
    } else if (platform.includes('linux')) {
      setPlatform(PlatformKind.Linux);
    } else {
      setPlatform(PlatformKind.Windows); // Default to Windows if platform is unrecognized
    }
  }, []);

  return platform;
}
