import React, { useState, useEffect } from 'react';

const StopWatch = ({ requestTimestamp }) => {
  const [milliseconds, setMilliseconds] = useState(0);

  const tickInterval = 200;
  const tick = () => {
    setMilliseconds(milliseconds + tickInterval);
  };

  useEffect(() => {
    let timerID = setInterval(() => tick(), tickInterval);
    return () => {
      clearInterval(timerID);
    };
  });

  useEffect(() => {
    setMilliseconds(Date.now() - requestTimestamp);
  }, [requestTimestamp]);

  if (milliseconds < 1000) {
    return 'Loading...';
  }

  let seconds = milliseconds / 1000;
  return <span>{seconds.toFixed(1)}s</span>;
};

export default StopWatch;
