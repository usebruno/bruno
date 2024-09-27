import { createListenerMiddleware } from '@reduxjs/toolkit';

const debugMiddleware = createListenerMiddleware();

debugMiddleware.startListening({
  predicate: () => true, // it'll track every change
  effect: (action, listenerApi) => {
    console.debug('---redux action---');
    console.debug('action', action.type); // which action did it
    console.debug('action.payload', action.payload);
    console.debug(listenerApi.getState()); // the updated store
  }
});

export default debugMiddleware;
