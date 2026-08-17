import { buildCleanupPlans } from './cleanup-plans';

const collection = {
  uid: 'collection-1',
  name: 'Test API',
  pathname: '/collections/test-api',
  brunoConfig: {
    onExit: {
      enabled: true,
      showReminder: true,
      reminderMessage: 'Clean up the shared environment.',
      requestPaths: ['requests/delete-session.bru', 'requests/stream.bru', 'requests/missing.bru']
    }
  },
  items: [
    {
      uid: 'http-1',
      pathname: '/collections/test-api/requests/delete-session.bru',
      name: 'Delete session',
      type: 'http-request',
      request: { method: 'DELETE' }
    },
    {
      uid: 'grpc-1',
      pathname: '/collections/test-api/requests/stream.bru',
      name: 'Stream',
      type: 'grpc-request',
      request: {}
    }
  ]
};

describe('buildCleanupPlans', () => {
  it('builds plans with supported requests and reports stale references', () => {
    expect(buildCleanupPlans([collection])).toEqual([{
      collectionUid: 'collection-1',
      collectionName: 'Test API',
      showReminder: true,
      reminderMessage: 'Clean up the shared environment.',
      requests: [collection.items[0]],
      missingRequestPaths: ['requests/stream.bru', 'requests/missing.bru']
    }]);
  });

  it('ignores disabled and empty configurations', () => {
    expect(buildCleanupPlans([{ ...collection, brunoConfig: { onExit: { enabled: false } } }])).toEqual([]);
    expect(buildCleanupPlans([{
      ...collection,
      brunoConfig: { onExit: { enabled: true, showReminder: false, requestPaths: [] } }
    }])).toEqual([]);
  });

  it('defaults an enabled collection to showing its reminder', () => {
    const [plan] = buildCleanupPlans([{
      ...collection,
      brunoConfig: { onExit: { enabled: true, reminderMessage: 'Reminder' } }
    }]);

    expect(plan.showReminder).toBe(true);
    expect(plan.reminderMessage).toBe('Reminder');
  });

  it('resolves committed request paths when runtime UIDs change after a restart', () => {
    const restartedCollection = {
      ...collection,
      items: [{ ...collection.items[0], uid: 'new-runtime-uid' }]
    };

    const [plan] = buildCleanupPlans([restartedCollection]);

    expect(plan.requests).toEqual([restartedCollection.items[0]]);
    expect(plan.missingRequestPaths).toEqual(['requests/stream.bru', 'requests/missing.bru']);
  });

  it('does not break the quit flow when a manually edited config has invalid request paths', () => {
    expect(buildCleanupPlans([{
      ...collection,
      brunoConfig: { onExit: { enabled: true, requestPaths: 42, reminderMessage: { invalid: true } } }
    }])).toEqual([{
      collectionUid: 'collection-1',
      collectionName: 'Test API',
      showReminder: true,
      reminderMessage: '',
      requests: [],
      missingRequestPaths: []
    }]);
  });
});
