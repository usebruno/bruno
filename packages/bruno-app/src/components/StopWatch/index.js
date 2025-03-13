import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

const StopWatch = ({ itemUid }) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  const startTime = useSelector(state => 
    state.collections.requestStartTimes[itemUid]
  );
  
  useEffect(() => {
    if (!startTime) return;
    
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    
    return () => clearInterval(intervalId);
  }, [startTime]);
  
  if (!startTime) return <span>Loading...</span>;
  
  const elapsedTime = currentTime - startTime;
  if (elapsedTime < 250) return <span>Loading...</span>;
  
  const seconds = elapsedTime / 1000;
  return <span>{seconds.toFixed(1)}s</span>;
};

export default React.memo(StopWatch);
