export const DEFAULT_CLEANUP_REQUEST_TIMEOUT_MS = 30000;

const runWithTimeout = ({ execute, onTimeout, timeoutMs, requestName }) => {
  let timeoutId;
  let settlementClaimed = false;

  const execution = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (settlementClaimed) return;
      settlementClaimed = true;

      Promise.resolve()
        .then(() => onTimeout?.())
        .catch(() => undefined)
        .then(() => reject(
          new Error(`Cleanup request “${requestName}” timed out after ${Math.round(timeoutMs / 1000)} seconds.`)
        ));
    }, timeoutMs);

    Promise.resolve()
      .then(execute)
      .then((result) => {
        if (settlementClaimed) return;
        settlementClaimed = true;
        resolve(result);
      })
      .catch((error) => {
        if (settlementClaimed) return;
        settlementClaimed = true;
        reject(error);
      });
  });

  return execution
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
