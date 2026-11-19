import { useEffect, useRef } from 'react';

const useSseAutoScroll = (result, view) => {
  const scrollRef = useRef(null);
  const followOutput = useRef(true);

  useEffect(() => {
    if (followOutput.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [result, view]);

  const onScroll = (event) => {
    const node = event.currentTarget;
    followOutput.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
  };

  return { scrollRef, onScroll };
};

export default useSseAutoScroll;
