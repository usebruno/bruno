import { actionsToIntercept, handleMakeTabParmanent } from "./utils";

export const draftDetectMiddleware = ({ dispatch, getState }) => (next) => (action) => {
  if (actionsToIntercept.includes(action.type)) {
    const state = getState();
    handleMakeTabParmanent(state, action, dispatch);
  }
  return next(action);
};
