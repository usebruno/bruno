import React, { useState, useEffect } from 'react';
import StyledWrapper from './StyledWrapper';

const TICK_INTERVAL = 100;

const isValidStartTime = (startTime) => Number.isFinite(startTime);

const getElapsedTime = (startTime, startMillis) => (
  isValidStartTime(startTime)
    ? Math.max(0, Date.now() - startTime)
    : startMillis
);

const ResponseStopWatch = ({ startTime, startMillis = 0 }) => {
  const [milliseconds, setMilliseconds] = useState(() => getElapsedTime(startTime, startMillis));

  useEffect(() => {
    setMilliseconds(getElapsedTime(startTime, startMillis));

    const timerId = setInterval(() => {
      setMilliseconds((currentMilliseconds) => (
        isValidStartTime(startTime)
          ? Math.max(0, Date.now() - startTime)
          : currentMilliseconds + TICK_INTERVAL
      ));
    }, TICK_INTERVAL);

    return () => clearInterval(timerId);
  }, [startTime, startMillis]);

  const secondsFormatted = `${(milliseconds / 1000).toFixed(1)}s`;
  const width = secondsFormatted.length * 0.4;

  return (
    <StyledWrapper className="ml-2" style={{ width: `${width}rem` }}>
      {secondsFormatted}
    </StyledWrapper>
  );
};

export default React.memo(ResponseStopWatch);
