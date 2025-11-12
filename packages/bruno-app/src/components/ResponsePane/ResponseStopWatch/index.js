import React, { useState, useEffect } from 'react';
import StyledWrapper from './StyledWrapper';

const ResponseStopWatch = ({ startMillis }) => {
  const [milliseconds, setMilliseconds] = useState(startMillis);

  const tickInterval = 100;
  const tick = () => {
    setMilliseconds(_milliseconds => _milliseconds + tickInterval);
  };

  useEffect(() => {
    let timerID = setInterval(() => {
      tick()
    }, tickInterval);
    return () => {
      clearTimeout(timerID);
    };
  }, []);

  let seconds = milliseconds / 1000;
  let secondsFormatted = `${seconds.toFixed(1)}s`;
  let width = secondsFormatted.length * 0.4; // Calculate width manually to stop parent layout from "flickering" by changing width too fast
  return <StyledWrapper className="ml-4" style={{width: `${width}rem`}}>{secondsFormatted}</StyledWrapper>;
};

export default React.memo(ResponseStopWatch);
