export const DEFAULT_CLEANUP_REQUEST_TIMEOUT_MS = 30000;
export const DEFAULT_CLEANUP_CANCELLATION_TIMEOUT_MS = 5000;

const waitForCancellation = ({ onTimeout, cancellationTimeoutMs, requestName }) => {
  let cancellationTimeoutId;
  const cancellationTimeout = new Promise((_, reject) => {
    cancellationTimeoutId = setTimeout(() => reject(
      new Error(
        `Cancellation for cleanup request “${requestName}” timed out after ${Math.round(cancellationTimeoutMs / 1000)} seconds.`
      )
    ), cancellationTimeoutMs);
  });

  return Promise.race([
    Promise.resolve().then(() => onTimeout?.()),
    cancellationTimeout
  ]).finally(() => clearTimeout(cancellationTimeoutId));
};

const runWithTimeout = ({ execute, onTimeout, timeoutMs, cancellationTimeoutMs, requestName }) => {
  let timeoutId;
  let settlementClaimed = false;

  const execution = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (settlementClaimed) return;
      settlementClaimed = true;

      waitForCancellation({ onTimeout, cancellationTimeoutMs, requestName })
        .then(() => reject(
          new Error(`Cleanup request “${requestName}” timed out after ${Math.round(timeoutMs / 1000)} seconds.`)
        ))
        .catch(reject);
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
  timeoutMs = DEFAULT_CLEANUP_REQUEST_TIMEOUT_MS,
  cancellationTimeoutMs = DEFAULT_CLEANUP_CANCELLATION_TIMEOUT_MS
}) => {
  const invalidPlan = plans.find((plan) => plan.missingRequestPaths.length);
  if (invalidPlan) {
    throw new Error(`One or more cleanup requests no longer exist in “${invalidPlan.collectionName}”.`);
  }

  for (const plan of plans) {
    for (const request of plan.requests) {
      const requestName = `${plan.collectionName} — ${request.name || request.filename}`;
      onRequestStart?.({ plan, request, requestName });

      await runWithTimeout({
        execute: () => runRequest(request, plan),
        onTimeout: () => cancelRequest?.(request, plan),
        timeoutMs,
        cancellationTimeoutMs,
        requestName
      });
    }
  }
};
