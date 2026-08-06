// Public API: the data-driven SegmentedControl (takes an `items` array).
//
// The compound building blocks (SegmentedControlBase + Segment) are kept
// internal on purpose. If a compound API is ever needed, re-export them here:
//   export { default as Segment } from './components/Segment';
//   export { default as SegmentedControlBase, SegmentedControlContext } from './components/SegmentedControlBase';
export { default } from './components/SegmentedControl';
