const locks = new Map();

const acquireLock = async (key, timeout = 10000) => {
  const startTime = Date.now();

  while (locks.has(key)) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Lock acquisition timeout for: ${key}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  let releaseFn;
  const releasePromise = new Promise((resolve) => {
    releaseFn = resolve;
  });

  locks.set(key, releasePromise);

  return () => {
    locks.delete(key);
    releaseFn();
  };
};

const withLock = async (key, fn) => {
  const release = await acquireLock(key);
  try {
    return await fn();
  } finally {
    release();
  }
};

const getWorkspaceLockKey = (workspacePath) => {
  return `workspace:${workspacePath}`;
};

module.exports = {
  acquireLock,
  withLock,
  getWorkspaceLockKey
};
