export const DEFAULT_CLEANUP_REQUEST_TIMEOUT_MS = 30000;

const runWithTimeout = ({ execute, onTimeout, timeoutMs, requestName }) => {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      Promise.resolve(onTimeout?.()).catch(() => undefined);
      reject(new Error(`Cleanup request “${requestName}” timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve().then(execute), timeout])
    .finally(() => clearTimeout(timeoutId));
};

export const executeCleanupPlans = async ({
  plans,
  runRequest,
  cancelRequest,
  onRequestStart,
  timeoutMs = DEFAULT_CLEANUP_REQUEST_TIMEOUT_MS
}) => {
  for (const plan of plans) {
    if (plan.missingRequestPaths.length) {
      throw new Error(`One or more cleanup requests no longer exist in “${plan.collectionName}”.`);
    }

    for (const request of plan.requests) {
      const requestName = `${plan.collectionName} — ${request.name || request.filename}`;
      onRequestStart?.({ plan, request, requestName });

      await runWithTimeout({
        execute: () => runRequest(request, plan),
        onTimeout: () => cancelRequest?.(request, plan),
        timeoutMs,
        requestName
      });
    }
  }
};
