import { createListenerMiddleware } from '@reduxjs/toolkit';

// ponytail: no active listeners registered (kept as a hook point for ad-hoc debugging,
// add a startListening() call here when you actually need to trace redux actions)
const debugMiddleware = createListenerMiddleware();

export default debugMiddleware;
