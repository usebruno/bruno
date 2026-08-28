import reducer, {
  updateGrpcScript,
  grpcScriptError,
  grpcTestResults,
  initRunRequestEvent,
  responseCleared
} from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';
const ITEM_UID = 'grpc-1';

const makeGrpcRequest = (overrides = {}) => ({
  url: 'localhost:50051',
  method: '/hello.Greeter/SayHello',
  methodType: 'unary',
  headers: [],
  auth: { mode: 'none' },
  body: { mode: 'grpc', grpc: [] },
  script: { beforeCallStart: null, afterCallEnd: null },
  ...overrides
});

const makeState = ({ item = {}, items } = {}) => ({
  collections: [
    {
      uid: COLLECTION_UID,
      pathname: '/coll',
      items: items || [
        {
          uid: ITEM_UID,
          name: 'say_hello',
          filename: 'say_hello.bru',
          pathname: '/coll/say_hello.bru',
          type: 'grpc-request',
          seq: 1,
          draft: null,
          request: makeGrpcRequest(),
          ...item
        }
      ]
    }
  ]
});

const itemFrom = (state) => state.collections[0].items[0];

describe('updateGrpcScript', () => {
  it('writes the hook into the draft request script', () => {
    const state = makeState();

    const next = reducer(
      state,
      updateGrpcScript({
        collectionUid: COLLECTION_UID,
        itemUid: ITEM_UID,
        hook: 'beforeCallStart',
        script: 'req.setMetadata("x-trace", "1");'
      })
    );

    expect(itemFrom(next).draft.request.script.beforeCallStart).toBe('req.setMetadata("x-trace", "1");');
  });

  it('writes afterCallEnd independently of beforeCallStart', () => {
    const state = makeState();

    const next = reducer(
      state,
      updateGrpcScript({
        collectionUid: COLLECTION_UID,
        itemUid: ITEM_UID,
        hook: 'afterCallEnd',
        script: 'bru.setVar("status", res.statusCode);'
      })
    );

    expect(itemFrom(next).draft.request.script.afterCallEnd).toBe('bru.setVar("status", res.statusCode);');
    expect(itemFrom(next).draft.request.script.beforeCallStart).toBeNull();
  });

  it.each([
    ['beforeMessageSend', 'bru.setVar("sent", bru.grpc.request.message.timestamp);'],
    ['afterMessageReceive', 'bru.setVar("received", bru.grpc.response.message.timestamp);']
  ])('writes the %s message hook into the draft request script', (hook, script) => {
    const state = makeState();

    const next = reducer(
      state,
      updateGrpcScript({ collectionUid: COLLECTION_UID, itemUid: ITEM_UID, hook, script })
    );

    expect(itemFrom(next).draft.request.script[hook]).toBe(script);
  });

  it('leaves the saved request untouched when creating the draft', () => {
    const state = makeState();

    const next = reducer(
      state,
      updateGrpcScript({
        collectionUid: COLLECTION_UID,
        itemUid: ITEM_UID,
        hook: 'beforeCallStart',
        script: 'console.log("draft only");'
      })
    );

    expect(itemFrom(next).request.script.beforeCallStart).toBeNull();
  });

  it('preserves the sibling hook already present on an existing draft', () => {
    const state = makeState({
      item: {
        draft: {
          uid: ITEM_UID,
          type: 'grpc-request',
          request: makeGrpcRequest({ script: { beforeCallStart: 'keep me', afterCallEnd: null } })
        }
      }
    });

    const next = reducer(
      state,
      updateGrpcScript({
        collectionUid: COLLECTION_UID,
        itemUid: ITEM_UID,
        hook: 'afterCallEnd',
        script: 'added'
      })
    );

    expect(itemFrom(next).draft.request.script).toEqual({ beforeCallStart: 'keep me', afterCallEnd: 'added' });
  });

  it('initializes script when the draft request has none', () => {
    const state = makeState({
      item: {
        draft: {
          uid: ITEM_UID,
          type: 'grpc-request',
          request: makeGrpcRequest({ script: undefined })
        }
      }
    });

    const next = reducer(
      state,
      updateGrpcScript({
        collectionUid: COLLECTION_UID,
        itemUid: ITEM_UID,
        hook: 'beforeCallStart',
        script: 'first script'
      })
    );

    expect(itemFrom(next).draft.request.script).toEqual({ beforeCallStart: 'first script' });
  });

  it('stores an empty string so clearing a hook is persisted', () => {
    const state = makeState({
      item: {
        draft: {
          uid: ITEM_UID,
          type: 'grpc-request',
          request: makeGrpcRequest({ script: { beforeCallStart: 'to be cleared', afterCallEnd: null } })
        }
      }
    });

    const next = reducer(
      state,
      updateGrpcScript({
        collectionUid: COLLECTION_UID,
        itemUid: ITEM_UID,
        hook: 'beforeCallStart',
        script: ''
      })
    );

    expect(itemFrom(next).draft.request.script.beforeCallStart).toBe('');
  });

  // The hook allowlist is the only thing stopping an arbitrary key from being written into
  // request.script, which the filestore would then try to serialize.
  // The below items are not in allow-list, hence the state remains the same after the reducer call.
  describe('hook allowlist', () => {
    it.each(['req', 'res', 'tests', 'proto', '__proto__', 'BeforeCallStart', 'beforemessagesend', 'onMessage', '', undefined, null])(
      'ignores the disallowed hook %p',
      (hook) => {
        const state = makeState();

        const next = reducer(
          state,
          updateGrpcScript({ collectionUid: COLLECTION_UID, itemUid: ITEM_UID, hook, script: 'nope' })
        );

        expect(next).toEqual(state);
        expect(itemFrom(next).draft).toBeNull();
      }
    );
  });

  it('ignores a folder item', () => {
    const state = makeState({
      items: [{ uid: 'folder-1', name: 'greeter', type: 'folder', items: [] }]
    });

    const next = reducer(
      state,
      updateGrpcScript({
        collectionUid: COLLECTION_UID,
        itemUid: 'folder-1',
        hook: 'beforeCallStart',
        script: 'nope'
      })
    );

    expect(next).toEqual(state);
  });

  it('ignores an unknown collection or item', () => {
    const state = makeState();

    const unknownCollection = reducer(
      state,
      updateGrpcScript({
        collectionUid: 'does-not-exist',
        itemUid: ITEM_UID,
        hook: 'beforeCallStart',
        script: 'nope'
      })
    );
    const unknownItem = reducer(
      state,
      updateGrpcScript({
        collectionUid: COLLECTION_UID,
        itemUid: 'does-not-exist',
        hook: 'beforeCallStart',
        script: 'nope'
      })
    );

    expect(unknownCollection).toEqual(state);
    expect(unknownItem).toEqual(state);
  });
});

describe('grpcScriptError', () => {
  const errorContext = {
    errorType: 'ReferenceError',
    filePath: 'say_hello.bru',
    errorLine: 2,
    lines: [{ lineNumber: 2, content: 'undefinedVar.foo;', isError: true }],
    stack: '    at say_hello.bru:2:1'
  };

  it('records a before-call-start failure with its context', () => {
    const state = makeState();

    const next = reducer(
      state,
      grpcScriptError({
        itemUid: ITEM_UID,
        collectionUid: COLLECTION_UID,
        scriptType: 'before-call-start',
        errorMessage: 'undefinedVar is not defined',
        errorContext
      })
    );

    expect(itemFrom(next).beforeCallStartScriptErrorMessage).toBe('undefinedVar is not defined');
    expect(itemFrom(next).beforeCallStartScriptErrorContext).toEqual(errorContext);
  });

  it('records an after-call-end failure with its context', () => {
    const state = makeState();

    const next = reducer(
      state,
      grpcScriptError({
        itemUid: ITEM_UID,
        collectionUid: COLLECTION_UID,
        scriptType: 'after-call-end',
        errorMessage: 'boom',
        errorContext
      })
    );

    expect(itemFrom(next).afterCallEndScriptErrorMessage).toBe('boom');
    expect(itemFrom(next).afterCallEndScriptErrorContext).toEqual(errorContext);
  });

  it.each([
    ['before-message-send', 'beforeMessageSendScriptErrorMessage', 'beforeMessageSendScriptErrorContext'],
    ['after-message-receive', 'afterMessageReceiveScriptErrorMessage', 'afterMessageReceiveScriptErrorContext']
  ])('records a %s failure with its context', (scriptType, messageKey, contextKey) => {
    const state = makeState();

    const next = reducer(
      state,
      grpcScriptError({
        itemUid: ITEM_UID,
        collectionUid: COLLECTION_UID,
        scriptType,
        // The main process folds the message index into the text, since only the last error is kept.
        errorMessage: 'Message 3: boom',
        errorContext
      })
    );

    expect(itemFrom(next)[messageKey]).toBe('Message 3: boom');
    expect(itemFrom(next)[contextKey]).toEqual(errorContext);
  });

  it('keeps only the last failure of a message hook, since it runs once per message', () => {
    const first = reducer(
      makeState(),
      grpcScriptError({
        itemUid: ITEM_UID,
        collectionUid: COLLECTION_UID,
        scriptType: 'after-message-receive',
        errorMessage: 'Message 1: boom',
        errorContext
      })
    );

    const next = reducer(
      first,
      grpcScriptError({
        itemUid: ITEM_UID,
        collectionUid: COLLECTION_UID,
        scriptType: 'after-message-receive',
        errorMessage: 'Message 2: bang',
        errorContext
      })
    );

    expect(itemFrom(next).afterMessageReceiveScriptErrorMessage).toBe('Message 2: bang');
  });

  // ScriptError picks the code-snippet card over the plain banner on the truthiness of the
  // context, so a missing context has to land as null rather than undefined.
  it('normalizes a missing error context to null', () => {
    const state = makeState();

    const next = reducer(
      state,
      grpcScriptError({
        itemUid: ITEM_UID,
        collectionUid: COLLECTION_UID,
        scriptType: 'before-call-start',
        errorMessage: 'no context available'
      })
    );

    expect(itemFrom(next).beforeCallStartScriptErrorContext).toBeNull();
  });

  it('does not clear the other hook error', () => {
    const state = makeState({
      item: {
        afterCallEndScriptErrorMessage: 'earlier failure',
        afterCallEndScriptErrorContext: errorContext
      }
    });

    const next = reducer(
      state,
      grpcScriptError({
        itemUid: ITEM_UID,
        collectionUid: COLLECTION_UID,
        scriptType: 'before-call-start',
        errorMessage: 'new failure',
        errorContext: null
      })
    );

    expect(itemFrom(next).beforeCallStartScriptErrorMessage).toBe('new failure');
    expect(itemFrom(next).afterCallEndScriptErrorMessage).toBe('earlier failure');
  });

  it.each(['pre-request', 'post-response', 'test', 'beforeCallStart', undefined])(
    'ignores the unrecognized script type %p',
    (scriptType) => {
      const state = makeState();

      const next = reducer(
        state,
        grpcScriptError({
          itemUid: ITEM_UID,
          collectionUid: COLLECTION_UID,
          scriptType,
          errorMessage: 'boom',
          errorContext
        })
      );

      expect(next).toEqual(state);
    }
  );

  it('ignores an unknown collection or item', () => {
    const state = makeState();

    const unknownCollection = reducer(
      state,
      grpcScriptError({
        itemUid: ITEM_UID,
        collectionUid: 'does-not-exist',
        scriptType: 'before-call-start',
        errorMessage: 'boom'
      })
    );
    const unknownItem = reducer(
      state,
      grpcScriptError({
        itemUid: 'does-not-exist',
        collectionUid: COLLECTION_UID,
        scriptType: 'before-call-start',
        errorMessage: 'boom'
      })
    );

    expect(unknownCollection).toEqual(state);
    expect(unknownItem).toEqual(state);
  });
});

describe('grpcTestResults', () => {
  const results = [
    { uid: 'r1', description: 'responds with OK', status: 'pass' },
    { uid: 'r2', description: 'carries a trailer', status: 'fail', error: 'expected 1 to equal 2' }
  ];

  it.each([
    ['before-call-start', 'beforeCallStartTestResults'],
    ['after-call-end', 'afterCallEndTestResults']
  ])('stores the %s results on the item', (scriptType, field) => {
    const state = makeState();

    const next = reducer(
      state,
      grpcTestResults({ itemUid: ITEM_UID, collectionUid: COLLECTION_UID, scriptType, results })
    );

    expect(itemFrom(next)[field]).toEqual(results);
  });

  it('does not clear the other hook results', () => {
    const state = makeState({ item: { afterCallEndTestResults: results } });

    const next = reducer(
      state,
      grpcTestResults({
        itemUid: ITEM_UID,
        collectionUid: COLLECTION_UID,
        scriptType: 'before-call-start',
        results: []
      })
    );

    expect(itemFrom(next).beforeCallStartTestResults).toEqual([]);
    expect(itemFrom(next).afterCallEndTestResults).toEqual(results);
  });

  it.each(['pre-request', 'post-response', 'beforeCallStart', undefined])(
    'ignores the unrecognized script type %p',
    (scriptType) => {
      const state = makeState();

      const next = reducer(
        state,
        grpcTestResults({ itemUid: ITEM_UID, collectionUid: COLLECTION_UID, scriptType, results })
      );

      expect(itemFrom(next).beforeCallStartTestResults).toBeUndefined();
      expect(itemFrom(next).afterCallEndTestResults).toBeUndefined();
    }
  );

  it.each([
    ['before-message-send', 'beforeMessageSendTestResults'],
    ['after-message-receive', 'afterMessageReceiveTestResults']
  ])('accumulates the %s results, tagging each with the message it came from', (scriptType, field) => {
    const first = reducer(
      makeState(),
      grpcTestResults({ itemUid: ITEM_UID, collectionUid: COLLECTION_UID, scriptType, results, messageIndex: 0 })
    );

    const next = reducer(
      first,
      grpcTestResults({ itemUid: ITEM_UID, collectionUid: COLLECTION_UID, scriptType, results, messageIndex: 1 })
    );

    expect(itemFrom(next)[field]).toEqual([
      ...results.map((result) => ({ ...result, messageIndex: 0 })),
      ...results.map((result) => ({ ...result, messageIndex: 1 }))
    ]);
  });

  it('keeps the call hooks replacing while the message hooks accumulate', () => {
    const withMessages = reducer(
      makeState(),
      grpcTestResults({
        itemUid: ITEM_UID,
        collectionUid: COLLECTION_UID,
        scriptType: 'after-message-receive',
        results,
        messageIndex: 0
      })
    );

    const next = reducer(
      withMessages,
      grpcTestResults({
        itemUid: ITEM_UID,
        collectionUid: COLLECTION_UID,
        scriptType: 'after-call-end',
        results
      })
    );

    expect(itemFrom(next).afterCallEndTestResults).toEqual(results);
    expect(itemFrom(next).afterMessageReceiveTestResults).toHaveLength(results.length);
  });

  it('ignores an unknown collection or item', () => {
    const state = makeState();

    const unknownCollection = reducer(
      state,
      grpcTestResults({
        itemUid: ITEM_UID,
        collectionUid: 'does-not-exist',
        scriptType: 'before-call-start',
        results
      })
    );
    const unknownItem = reducer(
      state,
      grpcTestResults({
        itemUid: 'does-not-exist',
        collectionUid: COLLECTION_UID,
        scriptType: 'before-call-start',
        results
      })
    );

    expect(unknownCollection).toEqual(state);
    expect(unknownItem).toEqual(state);
  });
});

// Every gRPC hook field the response pane reads has to be reset when the request is re-run,
// otherwise the previous run's banner or test results stay on screen alongside the new response.
describe('initRunRequestEvent', () => {
  const errorContext = {
    errorType: 'ReferenceError',
    filePath: 'say_hello.bru',
    errorLine: 2,
    lines: [{ lineNumber: 2, content: 'undefinedVar.foo;', isError: true }],
    stack: '    at say_hello.bru:2:1'
  };

  const previousRun = {
    beforeCallStartScriptErrorMessage: 'undefinedVar is not defined',
    afterCallEndScriptErrorMessage: 'boom',
    beforeMessageSendScriptErrorMessage: 'Message 1: no send',
    afterMessageReceiveScriptErrorMessage: 'Message 1: bang',
    beforeCallStartScriptErrorContext: errorContext,
    afterCallEndScriptErrorContext: errorContext,
    beforeMessageSendScriptErrorContext: errorContext,
    afterMessageReceiveScriptErrorContext: errorContext,
    beforeCallStartTestResults: [{ uid: 'r1', description: 'responds with OK', status: 'pass' }],
    afterCallEndTestResults: [{ uid: 'r2', description: 'carries a trailer', status: 'fail' }],
    beforeMessageSendTestResults: [{ uid: 'r3', description: 'message 1 is valid', status: 'pass', messageIndex: 0 }],
    afterMessageReceiveTestResults: [{ uid: 'r4', description: 'reply 1 is ok', status: 'pass', messageIndex: 0 }]
  };

  const rerun = (state) =>
    reducer(state, initRunRequestEvent({ requestUid: 'req-2', itemUid: ITEM_UID, collectionUid: COLLECTION_UID }));

  it('clears every hook test result', () => {
    const next = rerun(makeState({ item: previousRun }));

    expect(itemFrom(next).beforeCallStartTestResults).toEqual([]);
    expect(itemFrom(next).afterCallEndTestResults).toEqual([]);
    // These accumulate, so a stale list would keep growing run over run.
    expect(itemFrom(next).beforeMessageSendTestResults).toEqual([]);
    expect(itemFrom(next).afterMessageReceiveTestResults).toEqual([]);
  });

  it('clears every hook error message', () => {
    const next = rerun(makeState({ item: previousRun }));

    expect(itemFrom(next).beforeCallStartScriptErrorMessage).toBeNull();
    expect(itemFrom(next).afterCallEndScriptErrorMessage).toBeNull();
    expect(itemFrom(next).beforeMessageSendScriptErrorMessage).toBeNull();
    expect(itemFrom(next).afterMessageReceiveScriptErrorMessage).toBeNull();
  });

  it('clears every hook error context', () => {
    const next = rerun(makeState({ item: previousRun }));

    expect(itemFrom(next).beforeCallStartScriptErrorContext).toBeNull();
    expect(itemFrom(next).afterCallEndScriptErrorContext).toBeNull();
    expect(itemFrom(next).beforeMessageSendScriptErrorContext).toBeNull();
    expect(itemFrom(next).afterMessageReceiveScriptErrorContext).toBeNull();
  });

  it('leaves the hook scripts on the request alone', () => {
    const state = makeState({
      item: {
        ...previousRun,
        request: makeGrpcRequest({ script: { beforeCallStart: 'req.setMetadata("x", "1");', afterCallEnd: null } })
      }
    });

    const next = rerun(state);

    expect(itemFrom(next).request.script.beforeCallStart).toBe('req.setMetadata("x", "1");');
  });
});

describe('responseCleared', () => {
  it('clears every hook test result, including the accumulating message ones', () => {
    const state = makeState({
      item: {
        response: { statusCode: 0 },
        beforeCallStartTestResults: [{ uid: 'r1', description: 'responds with OK', status: 'pass' }],
        afterCallEndTestResults: [{ uid: 'r2', description: 'carries a trailer', status: 'fail' }],
        beforeMessageSendTestResults: [{ uid: 'r3', description: 'message 1 is valid', status: 'pass', messageIndex: 0 }],
        afterMessageReceiveTestResults: [{ uid: 'r4', description: 'reply 1 is ok', status: 'pass', messageIndex: 0 }]
      }
    });

    const next = reducer(state, responseCleared({ itemUid: ITEM_UID, collectionUid: COLLECTION_UID }));

    expect(itemFrom(next).beforeCallStartTestResults).toEqual([]);
    expect(itemFrom(next).afterCallEndTestResults).toEqual([]);
    expect(itemFrom(next).beforeMessageSendTestResults).toEqual([]);
    expect(itemFrom(next).afterMessageReceiveTestResults).toEqual([]);
  });
});
