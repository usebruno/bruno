import { useEffect } from 'react';

export default function useOnMount(mountedFunction, cleanupFunction = null) {
  useEffect(() => {
    mountedFunction();
    return () => {
      if (cleanupFunction) {
        cleanupFunction();
      }
    };
  }, []);
}
