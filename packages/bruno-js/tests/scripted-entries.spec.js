const { bindRunRequest, createScopeSetter } = require('../src/runtime/scripted-entries');

describe('bindRunRequest', () => {
  test('does nothing when no host function is provided', () => {
    const bru = {};
    bindRunRequest(bru, undefined);
    expect(bru.runRequest).toBeUndefined();
  });

  test('exposes bru.runRequest that forwards (pathname, callerBru) to the host', async () => {
    const host = jest.fn().mockResolvedValue('done');
    const bru = {};

    bindRunRequest(bru, host);
    const result = await bru.runRequest('relative/path.bru');

    expect(result).toBe('done');
    expect(host).toHaveBeenCalledTimes(1);
    expect(host).toHaveBeenCalledWith('relative/path.bru', bru);
  });

  test('each bru gets bound with its own callerBru so entries can be attributed', async () => {
    const host = jest.fn().mockResolvedValue(null);
    const bruA = { name: 'A' };
    const bruB = { name: 'B' };

    bindRunRequest(bruA, host);
    bindRunRequest(bruB, host);

    await bruA.runRequest('a.bru');
    await bruB.runRequest('b.bru');

    expect(host).toHaveBeenNthCalledWith(1, 'a.bru', bruA);
    expect(host).toHaveBeenNthCalledWith(2, 'b.bru', bruB);
  });
});

describe('createScopeSetter', () => {
  test('mutates bru._currentScope with the scope object', () => {
    const bru = {};
    const setScope = createScopeSetter(bru);

    setScope({ type: 'collection', sourceFile: 'collection.bru' });
    expect(bru._currentScope).toEqual({ type: 'collection', sourceFile: 'collection.bru' });

    setScope({ type: 'request', sourceFile: 'auth/login.bru' });
    expect(bru._currentScope).toEqual({ type: 'request', sourceFile: 'auth/login.bru' });
  });

  test('clears _currentScope when called with a falsy value', () => {
    const bru = { _currentScope: { type: 'folder', sourceFile: 'auth/folder.bru' } };
    const setScope = createScopeSetter(bru);

    setScope(null);
    expect(bru._currentScope).toBeNull();

    setScope({ type: 'request', sourceFile: 'x.bru' });
    setScope(undefined);
    expect(bru._currentScope).toBeNull();
  });
});
