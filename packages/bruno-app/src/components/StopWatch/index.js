import React, { useState, useEffect } from 'react';

const StopWatch = () => {
  const [milliseconds, setMilliseconds] = useState(0);

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

  if (milliseconds < 250) {
    return 'Loading...';
  }

  let seconds = milliseconds / 1000;
  return <span>{seconds.toFixed(1)}s</span>;
};

export default React.memo(StopWatch);
