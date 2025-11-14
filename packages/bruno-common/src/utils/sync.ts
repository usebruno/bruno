type Resolver = (value: unknown) => void;

const _sleep = (delay: number) => {
  let resolve: undefined | Resolver;
  const promise = new Promise((r) => {
    resolve = r;
  });
  setTimeout(() => {
    resolve?.(undefined);
  }, delay);
  return promise;
};

export class WaitGroup {
  pending = 0;

  add() {
    this.pending += 1;
  }

  done() {
    this.pending -= 1;
  }

  async wait() {
    if (this.pending === 0) {
      return;
    }
    return new Promise(async (resolve) => {
      if (this.pending === 0) {
        return resolve(undefined);
      }
      await _sleep(100);
      this.wait().then(resolve);
    });
  }
}
