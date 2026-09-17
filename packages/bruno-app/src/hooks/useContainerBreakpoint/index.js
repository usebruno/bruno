import { useCallback, useRef, useState } from 'react';

// Every breakpoint the container is currently under, as a className string.
// Classes are cumulative, so a single selector covers "at most this wide".
const resolveClassName = (width, breakpoints) =>
  Object.keys(breakpoints)
    .filter((className) => width < breakpoints[className])
    .join(' ');

/**
 * Measures a container and returns the breakpoint classes it currently matches.
 *
 * Container queries would express this in CSS, but styled-components v5 compiles through
 * @emotion/stylis, which mangles `@container` into invalid — and un-scoped — output.
 *
 * The hook is deliberately unopinionated about names: callers supply their own, so
 * the resulting CSS reads in the vocabulary of whatever component is collapsing.
 *
 * @param {Object} breakpoints - class name -> exclusive max width in px
 * @returns {[Function, string]} a callback ref for the container, and its classes
 */
const useContainerBreakpoint = (breakpoints) => {
  const breakpointsRef = useRef(breakpoints);
  breakpointsRef.current = breakpoints;

  const [breakpointClass, setBreakpointClass] = useState('');

  const observerRef = useRef(null);
  const frameRef = useRef(null);

  const containerRef = useCallback((node) => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    observerRef.current?.disconnect();
    observerRef.current = null;

    // React calls the ref with null on unmount, so the teardown above is the cleanup.
    if (!node || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const width = node.clientWidth;
      if (!width) return;

      setBreakpointClass(resolveClassName(width, breakpointsRef.current));
    };

    observerRef.current = new ResizeObserver(() => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(measure);
    });
    observerRef.current.observe(node);
    measure();
  }, []);

  return [containerRef, breakpointClass];
};

export default useContainerBreakpoint;
