// Public API: the data-driven RadioGroup (takes an `items` array).
//
// The compound building blocks (RadioGroupBase + Radio) are kept internal on
// purpose. If a compound API is ever needed, re-export them here:
//   export { default as Radio } from './components/Radio';
//   export { default as RadioGroupBase, RadioGroupContext } from './components/RadioGroupBase';
export { default } from './components/RadioGroup';
