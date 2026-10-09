import { throttle } from 'lodash';
import { useMemo, useRef } from 'react';

const useLeadingThrottle = (callback, waitMs) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(
    () => throttle((...args) => callbackRef.current(...args), waitMs, { leading: true, trailing: false }),
    [waitMs]
  );
};

export default useLeadingThrottle;
