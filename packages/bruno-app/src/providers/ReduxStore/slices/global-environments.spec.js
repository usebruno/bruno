jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

jest.mock('@usebruno/schema', () => ({
  environmentSchema: { validate: () => Promise.resolve() }
}));

import { configureStore } from '@reduxjs/toolkit';
import globalEnvironmentsReducer, {
  globalEnvironmentsUpdateEvent,
  _clearScriptGlobalEnvBaseline,
  updateGlobalEnvironments
} from 'providers/ReduxStore/slices/global-environments';

const ENV_UID = 'genv-1';

const makeVar = (name, value, enabled = true) => ({
  uid: `uid-${name}`,
  name,
  value,
  type: 'text',
  secret: false,
  enabled
});

// Minimal mock for window.ipcRenderer used by the thunk's disk persistence
beforeAll(() => {
  window.ipcRenderer = { invoke: jest.fn().mockResolvedValue(true) };
});

const createStore = (envVars = [], opts = {}) => {
  const preloadedState = {
    globalEnvironments: {
      globalEnvironments: [
        { uid: ENV_UID, name: 'GlobalTest', variables: envVars, color: null }
      ],
      activeGlobalEnvironmentUid: ENV_UID,
      globalEnvironmentDraft: opts.draft || null,
      _scriptGlobalEnvBaseline: opts.baseline || null
    },
    workspaces: {
      activeWorkspaceUid: 'ws-1',
      workspaces: [{ uid: 'ws-1', pathname: '/workspace' }]
    }
  };

  return configureStore({
    reducer: {
      globalEnvironments: globalEnvironmentsReducer,
      workspaces: (state = preloadedState.workspaces) => state
    },
    preloadedState
  });
};

const getEnv = (store) => {
  const state = store.getState();
  return state.globalEnvironments.globalEnvironments.find((e) => e.uid === ENV_UID);
};

const getGlobalState = (store) => store.getState().globalEnvironments;

describe('globalEnvironmentsUpdateEvent — draft-aware merge', () => {
  describe('no draft pending (original behavior)', () => {
    test('updates existing variable values', () => {
      const store = createStore([makeVar('HOST', 'https://old.com')]);

      store.dispatch(globalEnvironmentsUpdateEvent({ globalEnvironmentVariables: { HOST: 'https://new.com' } }));

      expect(getEnv(store).variables).toHaveLength(1);
      expect(getEnv(store).variables[0].value).toBe('https://new.com');
    });

    test('adds new variables from script', () => {
      const store = createStore([makeVar('HOST', 'https://example.com')]);

      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { HOST: 'https://example.com', TOKEN: 'abc' }
      }));

      expect(getEnv(store).variables).toHaveLength(2);
      expect(getEnv(store).variables.find((v) => v.name === 'TOKEN').value).toBe('abc');
    });

    test('removes enabled variables deleted by script', () => {
      const store = createStore([
        makeVar('HOST', 'https://example.com'),
        makeVar('OLD_VAR', 'remove-me')
      ]);

      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { HOST: 'https://example.com' }
      }));

      expect(getEnv(store).variables).toHaveLength(1);
      expect(getEnv(store).variables[0].name).toBe('HOST');
    });

    test('preserves disabled variables even if not in script output', () => {
      const store = createStore([
        makeVar('HOST', 'https://example.com'),
        makeVar('DISABLED_VAR', 'keep', false)
      ]);

      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { HOST: 'https://example.com' }
      }));

      expect(getEnv(store).variables).toHaveLength(2);
      expect(getEnv(store).variables.find((v) => v.name === 'DISABLED_VAR')).toBeDefined();
    });
  });

  describe('draft pending — first script event', () => {
    test('flushes draft, creates baseline, and applies only script changes', () => {
      const savedVars = [makeVar('HOST', 'https://saved.com')];
      const draftVars = [makeVar('HOST', 'https://draft-edit.com')];
      const store = createStore(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { HOST: 'https://saved.com', TOKEN: 'new-token' }
      }));

      const vars = getEnv(store).variables;
      // HOST: script didn't change it → draft value preserved
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://draft-edit.com');
      // TOKEN: new from script → added
      expect(vars.find((v) => v.name === 'TOKEN').value).toBe('new-token');
      // Draft cleared
      expect(getGlobalState(store).globalEnvironmentDraft).toBeNull();
      // Baseline set
      expect(getGlobalState(store)._scriptGlobalEnvBaseline).toEqual({ HOST: 'https://saved.com' });
    });

    test('applies script modification over draft edit of same variable', () => {
      const savedVars = [makeVar('TOKEN', 'saved-token')];
      const draftVars = [makeVar('TOKEN', 'draft-token')];
      const store = createStore(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { TOKEN: 'script-token' }
      }));

      expect(getEnv(store).variables[0].value).toBe('script-token');
    });

    test('preserves draft-only variables that script does not know about', () => {
      const savedVars = [makeVar('HOST', 'https://saved.com')];
      const draftVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('NEW_DRAFT_VAR', 'draft-only-value')
      ];
      const store = createStore(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { HOST: 'https://saved.com' }
      }));

      const vars = getEnv(store).variables;
      expect(vars).toHaveLength(2);
      expect(vars.find((v) => v.name === 'NEW_DRAFT_VAR').value).toBe('draft-only-value');
    });

    test('ignores draft for non-active environment', () => {
      const savedVars = [makeVar('HOST', 'https://saved.com')];
      const store = createStore(savedVars, {
        draft: { environmentUid: 'other-env-uid', variables: [makeVar('HOST', 'https://draft.com')] }
      });

      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { HOST: 'https://new.com' }
      }));

      // Draft should NOT be flushed (different env)
      expect(getGlobalState(store).globalEnvironmentDraft).not.toBeNull();
      // Should apply directly
      expect(getEnv(store).variables[0].value).toBe('https://new.com');
      expect(getGlobalState(store)._scriptGlobalEnvBaseline).toBeNull();
    });
  });

  describe('baseline exists — subsequent script events', () => {
    test('preserves draft edits across multiple script events', () => {
      const savedVars = [makeVar('HOST', 'https://saved.com')];
      const draftVars = [makeVar('HOST', 'https://draft.com')];
      const store = createStore(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      // First event
      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { HOST: 'https://saved.com', TOKEN: 'abc' }
      }));

      // Second event — same data
      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { HOST: 'https://saved.com', TOKEN: 'abc' }
      }));

      const vars = getEnv(store).variables;
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://draft.com');
      expect(vars.find((v) => v.name === 'TOKEN').value).toBe('abc');
    });

    test('applies new changes from later script events', () => {
      const savedVars = [makeVar('HOST', 'https://saved.com')];
      const draftVars = [makeVar('HOST', 'https://draft.com')];
      const store = createStore(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      // First event
      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { HOST: 'https://saved.com', TOKEN: 'abc' }
      }));

      // Second event: post-response adds RESULT
      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { HOST: 'https://saved.com', TOKEN: 'abc', RESULT: 'ok' }
      }));

      const vars = getEnv(store).variables;
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://draft.com');
      expect(vars.find((v) => v.name === 'TOKEN').value).toBe('abc');
      expect(vars.find((v) => v.name === 'RESULT').value).toBe('ok');
    });
  });

  describe('deleteGlobalEnvVar — script deletes a variable', () => {
    test('no draft: removes the variable', () => {
      const store = createStore([
        makeVar('HOST', 'https://example.com'),
        makeVar('TOKEN', 'secret')
      ]);

      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { HOST: 'https://example.com' }
      }));

      expect(getEnv(store).variables).toHaveLength(1);
      expect(getEnv(store).variables[0].name).toBe('HOST');
    });

    test('with draft: removes variable that existed in saved state', () => {
      const savedVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('TOKEN', 'saved-token')
      ];
      const draftVars = [
        makeVar('HOST', 'https://draft.com'),
        makeVar('TOKEN', 'draft-token')
      ];
      const store = createStore(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      // Script deleted TOKEN
      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { HOST: 'https://saved.com' }
      }));

      const vars = getEnv(store).variables;
      expect(vars.find((v) => v.name === 'TOKEN')).toBeUndefined();
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://draft.com');
    });

    test('with draft: does not remove draft-only variables', () => {
      const savedVars = [makeVar('HOST', 'https://saved.com')];
      const draftVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('DRAFT_ONLY', 'user-added')
      ];
      const store = createStore(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { HOST: 'https://saved.com' }
      }));

      const vars = getEnv(store).variables;
      expect(vars.find((v) => v.name === 'DRAFT_ONLY').value).toBe('user-added');
    });
  });

  describe('deleteAllGlobalEnvVars — script clears all variables', () => {
    test('no draft: removes all enabled variables', () => {
      const store = createStore([
        makeVar('HOST', 'https://example.com'),
        makeVar('TOKEN', 'secret'),
        makeVar('DISABLED', 'keep', false)
      ]);

      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: {}
      }));

      const vars = getEnv(store).variables;
      expect(vars).toHaveLength(1);
      expect(vars[0].name).toBe('DISABLED');
    });

    test('with draft: removes saved vars but keeps draft-only vars', () => {
      const savedVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('TOKEN', 'saved-token')
      ];
      const draftVars = [
        makeVar('HOST', 'https://draft.com'),
        makeVar('TOKEN', 'draft-token'),
        makeVar('DRAFT_ONLY', 'user-added')
      ];
      const store = createStore(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: {}
      }));

      const vars = getEnv(store).variables;
      expect(vars.find((v) => v.name === 'HOST')).toBeUndefined();
      expect(vars.find((v) => v.name === 'TOKEN')).toBeUndefined();
      expect(vars.find((v) => v.name === 'DRAFT_ONLY').value).toBe('user-added');
    });
  });

  describe('mixed operations — set + delete in same script', () => {
    test('with draft: script adds, modifies, and deletes — draft edits preserved', () => {
      const savedVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('TOKEN', 'saved-token'),
        makeVar('TO_DELETE', 'remove-me')
      ];
      const draftVars = [
        makeVar('HOST', 'https://draft.com'),
        makeVar('TOKEN', 'draft-token'),
        makeVar('TO_DELETE', 'draft-value'),
        makeVar('DRAFT_NEW', 'from-user')
      ];
      const store = createStore(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      store.dispatch(globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: {
          HOST: 'https://saved.com',
          TOKEN: 'script-token',
          SCRIPT_NEW: 'from-script'
        }
      }));

      const vars = getEnv(store).variables;
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://draft.com');
      expect(vars.find((v) => v.name === 'TOKEN').value).toBe('script-token');
      expect(vars.find((v) => v.name === 'TO_DELETE')).toBeUndefined();
      expect(vars.find((v) => v.name === 'DRAFT_NEW').value).toBe('from-user');
      expect(vars.find((v) => v.name === 'SCRIPT_NEW').value).toBe('from-script');
    });
  });

  describe('typed values — dataType inference', () => {
    test('infers number dataType when script sets a numeric value', () => {
      const store = createStore([makeVar('COUNT', '0')]);

      store.dispatch(globalEnvironmentsUpdateEvent({ globalEnvironmentVariables: { COUNT: 42 } }));

      const v = getEnv(store).variables.find((v) => v.name === 'COUNT');
      expect(v.value).toBe(42);
      expect(v.dataType).toBe('number');
    });

    test('infers boolean dataType when script sets a boolean value', () => {
      const store = createStore([makeVar('FLAG', 'false')]);

      store.dispatch(globalEnvironmentsUpdateEvent({ globalEnvironmentVariables: { FLAG: true } }));

      const v = getEnv(store).variables.find((v) => v.name === 'FLAG');
      expect(v.value).toBe(true);
      expect(v.dataType).toBe('boolean');
    });

    test('infers object dataType when script sets an object value', () => {
      const store = createStore([makeVar('CONFIG', '')]);

      store.dispatch(globalEnvironmentsUpdateEvent({ globalEnvironmentVariables: { CONFIG: { port: 3000 } } }));

      const v = getEnv(store).variables.find((v) => v.name === 'CONFIG');
      expect(v.value).toEqual({ port: 3000 });
      expect(v.dataType).toBe('object');
    });

    test('keeps existing dataType on a typed var the script did not touch', () => {
      const typedVar = { ...makeVar('COUNT', 42), dataType: 'number' };
      const store = createStore([typedVar, makeVar('HOST', 'https://example.com')]);

      // Script touched HOST only; the runtime payload still carries COUNT (unchanged).
      store.dispatch(globalEnvironmentsUpdateEvent({ globalEnvironmentVariables: { COUNT: 42, HOST: 'https://new.com' } }));

      const v = getEnv(store).variables.find((v) => v.name === 'COUNT');
      expect(v.dataType).toBe('number');
    });

    test('drops dataType when script replaces a typed value with a string', () => {
      const typedVar = { ...makeVar('COUNT', 42), dataType: 'number' };
      const store = createStore([typedVar]);

      store.dispatch(globalEnvironmentsUpdateEvent({ globalEnvironmentVariables: { COUNT: 'not-a-number' } }));

      const v = getEnv(store).variables.find((v) => v.name === 'COUNT');
      expect(v.dataType).toBeUndefined();
    });

    test('updates dataType when script changes the value type', () => {
      const typedVar = { ...makeVar('VAL', 42), dataType: 'number' };
      const store = createStore([typedVar]);

      store.dispatch(globalEnvironmentsUpdateEvent({ globalEnvironmentVariables: { VAL: true } }));

      const v = getEnv(store).variables.find((v) => v.name === 'VAL');
      expect(v.value).toBe(true);
      expect(v.dataType).toBe('boolean');
    });
  });

  describe('baseline cleanup', () => {
    test('_clearScriptGlobalEnvBaseline clears the baseline', () => {
      const store = createStore([makeVar('HOST', 'https://saved.com')], {
        baseline: { HOST: 'https://saved.com' }
      });

      expect(getGlobalState(store)._scriptGlobalEnvBaseline).not.toBeNull();

      store.dispatch(_clearScriptGlobalEnvBaseline());

      expect(getGlobalState(store)._scriptGlobalEnvBaseline).toBeNull();
    });
  });

  describe('object/array typed-var no-op writes preserve draft (deep-equal compare)', () => {
    test('script re-writing a structurally-equal object value does NOT clobber draft edit', () => {
      const savedVar = { ...makeVar('CFG', { port: 3000 }), dataType: 'object' };
      const draftVar = { ...makeVar('CFG', { port: 4000 }), dataType: 'object' };
      const store = createStore([savedVar], {
        draft: { environmentUid: ENV_UID, variables: [draftVar] }
      });

      store.dispatch(globalEnvironmentsUpdateEvent({ globalEnvironmentVariables: { CFG: { port: 3000 } } }));

      const v = getEnv(store).variables.find((v) => v.name === 'CFG');
      expect(v.value).toEqual({ port: 4000 });
    });
  });

  describe('disabled-var name collision — script targets enabled slot only', () => {
    test('script setting X writes to the enabled X, leaves the disabled X untouched', () => {
      const disabledX = makeVar('X', 'archived', false);
      const enabledX = makeVar('X', 'current');
      const store = createStore([disabledX, enabledX]);

      store.dispatch(globalEnvironmentsUpdateEvent({ globalEnvironmentVariables: { X: 'updated' } }));

      const xVars = getEnv(store).variables.filter((v) => v.name === 'X');
      expect(xVars).toHaveLength(2);
      expect(xVars.find((v) => v.enabled === false).value).toBe('archived');
      expect(xVars.find((v) => v.enabled === true).value).toBe('updated');
    });
  });
});

describe('updateGlobalEnvironments — activeGlobalEnvironmentUid resolution', () => {
  // The reducer trusts the caller-supplied active uid (every consumer derives it from the
  // per-workspace electron store) and only validates it against the new env list, dropping
  // to null if the uid doesn't match any env.
  const setup = (preEnvs, preActiveUid, payloadEnvs, payloadActiveUid) => {
    const preloadedState = {
      globalEnvironments: {
        globalEnvironments: preEnvs,
        activeGlobalEnvironmentUid: preActiveUid,
        globalEnvironmentDraft: null,
        _scriptGlobalEnvBaseline: null
      }
    };
    const store = configureStore({
      reducer: { globalEnvironments: globalEnvironmentsReducer },
      preloadedState
    });
    store.dispatch(updateGlobalEnvironments({
      globalEnvironments: payloadEnvs,
      activeGlobalEnvironmentUid: payloadActiveUid
    }));
    return store.getState().globalEnvironments.activeGlobalEnvironmentUid;
  };

  test('incoming uid present in new envs → resolved to incoming uid', () => {
    const result = setup(
      [{ uid: 'old-1', name: 'Stage' }],
      'old-1',
      [{ uid: 'new-1', name: 'Stage' }, { uid: 'new-2', name: 'Prod' }],
      'new-2'
    );
    expect(result).toBe('new-2');
  });

  test('incoming uid not in new envs → null (stale uid is dropped)', () => {
    const result = setup(
      [{ uid: 'gone', name: 'DeletedEnv' }],
      'gone',
      [{ uid: 'other', name: 'Different' }],
      'gone'
    );
    expect(result).toBeNull();
  });

  test('no incoming uid + no prior state → null', () => {
    const result = setup(
      [],
      null,
      [{ uid: 'env-A', name: 'Stage' }],
      null
    );
    expect(result).toBeNull();
  });
});
