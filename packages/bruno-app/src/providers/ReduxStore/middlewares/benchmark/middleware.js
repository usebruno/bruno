import { measureReduxDispatch } from 'utils/benchmark';

export const benchmarkMiddleware = () => (next) => (action) => {
  if (typeof action?.type !== 'string') {
    return next(action);
  }

  return measureReduxDispatch(action.type, () => next(action));
};
