import React, { useState, useEffect } from 'react';
import StyledWrapper from './StyledWrapper';

const TICK_INTERVAL = 100;

const ResponseStopWatch = ({ startTimestamp }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timerID = setInterval(() => {
      setNow(Date.now());
    }, TICK_INTERVAL);
    return () => {
      clearInterval(timerID);
    };
  }, []);

  const elapsedMillis = startTimestamp ? Math.max(0, now - startTimestamp) : 0;
  const secondsFormatted = `${(elapsedMillis / 1000).toFixed(1)}s`;
  const width = secondsFormatted.length * 0.4; // Calculate width manually to stop parent layout from "flickering" by changing width too fast

  return (
    <StyledWrapper className="ml-2" style={{ width: `${width}rem` }}>
      {secondsFormatted}
    </StyledWrapper>
  );
};

export default React.memo(ResponseStopWatch);
