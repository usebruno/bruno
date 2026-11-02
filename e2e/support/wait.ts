import { setTimeout } from 'timers/promises';

// TODO: reaper Might not be necessary, figure out a better way later
export const waitForPredicate = async (predicate: () => Promise<boolean>, { tries = 10, interval = 100 } = {}) => {
  let result;
  let retries = tries;
  do {
    result = await predicate();
    retries -= 1;
    await setTimeout(interval);
  } while (!result && retries > 0);
  return result;
};
