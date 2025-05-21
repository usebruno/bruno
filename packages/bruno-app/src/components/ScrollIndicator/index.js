import React, { useState, useEffect } from 'react';
import StyledWrapper from './StyledWrapper';

// Animated mouse icon with scrolling wheel animation
export const AnimatedMouseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="animated-mouse-icon"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M6 3m0 4a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-4a4 4 0 0 1 -4 -4z" />
    <path className="scroll-wheel-animation" d="M12 7l0 4" />
  </svg>
);

/**
 * A reusable scroll indicator component with animated mouse icon
 * @param {React.RefObject} containerRef - Reference to the scrollable container
 * @param {Array} dependencies - Dependencies to watch for changes and recalculate overflow
 * @returns {JSX.Element} Scroll indicator component
 */
const ScrollIndicator = ({ containerRef, dependencies = [] }) => {
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  // Check for overflow when dependencies change
  useEffect(() => {
    const checkForOverflow = () => {
      if (containerRef.current) {
        const { scrollHeight, clientHeight } = containerRef.current;
        const hasContentOverflow = scrollHeight > clientHeight;
        setHasOverflow(hasContentOverflow);
        
        // If there's overflow, also check if we're scrolled to the bottom
        if (hasContentOverflow) {
          checkScrollPosition();
        }
      }
    };
    
    const checkScrollPosition = () => {
      if (containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        // Consider scrolled to bottom if within 20px of the actual bottom
        const isBottom = scrollHeight - scrollTop - clientHeight < 20;
        setIsScrolledToBottom(isBottom);
      }
    };
    
    // Add scroll event listener
    const handleScroll = () => {
      checkScrollPosition();
    };
    
    checkForOverflow();
    
    // Add event listeners
    const containerElement = containerRef.current;
    if (containerElement) {
      containerElement.addEventListener('scroll', handleScroll);
    }
    
    window.addEventListener('resize', checkForOverflow);
    
    return () => {
      window.removeEventListener('resize', checkForOverflow);
      if (containerElement) {
        containerElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [containerRef, ...dependencies]);

  return (
    <StyledWrapper>
      <div className={`scroll-indicator ${hasOverflow && !isScrolledToBottom ? 'visible' : ''}`}>
        <div className="chevron-container">
          <div className="mouse-scroll-indicator">
            <AnimatedMouseIcon />
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default ScrollIndicator; 