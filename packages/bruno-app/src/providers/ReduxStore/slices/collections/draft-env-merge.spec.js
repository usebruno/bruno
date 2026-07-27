jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

import reducer, {
  scriptEnvironmentUpdateEvent,
  initRunRequestEvent
} from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';
const ENV_UID = 'env-1';
const ITEM_UID = 'req-1';
const REQUEST_UID = 'run-1';

const makeVar = (name, value, enabled = true) => ({
  uid: `uid-${name}`,
  name,
  value,
  type: 'text',
  secret: false,
  enabled
});

const makeInitialState = (envVars = [], opts = {}) => ({
  collections: [
    {
      uid: COLLECTION_UID,
      pathname: '/coll',
      activeEnvironmentUid: ENV_UID,
      environments: [
        {
          uid: ENV_UID,
          name: 'Test',
          variables: envVars
        }
      ],
      environmentsDraft: opts.draft || null,
      _scriptEnvBaseline: opts.baseline || undefined,
      runtimeVariables: {},
      items: [
        {
          uid: ITEM_UID,
          name: 'ping',
          type: 'http-request',
          request: { url: 'https://example.com/ping', method: 'GET' }
        }
      ]
    }
  ],
  collectionSortOrder: 'default',
  activeWorkspaceUid: null
});

const scriptEvent = (envVariables) =>
  scriptEnvironmentUpdateEvent({
    collectionUid: COLLECTION_UID,
    envVariables
  });

const getEnv = (state) => state.collections[0].environments[0];
const getCollection = (state) => state.collections[0];

describe('scriptEnvironmentUpdateEvent — draft-aware merge', () => {
  describe('no draft pending (original behavior)', () => {
    test('updates existing variable values', () => {
      let state = makeInitialState([makeVar('HOST', 'https://old.com')]);

      state = reducer(state, scriptEvent({ HOST: 'https://new.com', __name__: 'Test' }));

      expect(getEnv(state).variables).toHaveLength(1);
      expect(getEnv(state).variables[0].value).toBe('https://new.com');
    });

    test('adds new variables from script', () => {
      let state = makeInitialState([makeVar('HOST', 'https://example.com')]);

      state = reducer(state, scriptEvent({ HOST: 'https://example.com', TOKEN: 'abc', __name__: 'Test' }));

      expect(getEnv(state).variables).toHaveLength(2);
      expect(getEnv(state).variables[1].name).toBe('TOKEN');
      expect(getEnv(state).variables[1].value).toBe('abc');
    });

    test('removes enabled variables deleted by script', () => {
      let state = makeInitialState([
        makeVar('HOST', 'https://example.com'),
        makeVar('OLD_VAR', 'remove-me')
      ]);

      state = reducer(state, scriptEvent({ HOST: 'https://example.com', __name__: 'Test' }));

      expect(getEnv(state).variables).toHaveLength(1);
      expect(getEnv(state).variables[0].name).toBe('HOST');
    });

    test('preserves disabled variables even if not in script output', () => {
      let state = makeInitialState([
        makeVar('HOST', 'https://example.com'),
        makeVar('DISABLED_VAR', 'keep-me', false)
      ]);

      state = reducer(state, scriptEvent({ HOST: 'https://example.com', __name__: 'Test' }));

      expect(getEnv(state).variables).toHaveLength(2);
      expect(getEnv(state).variables[1].name).toBe('DISABLED_VAR');
    });
  });

  describe('draft pending — first script event', () => {
    test('flushes draft, creates baseline, and applies only script changes', () => {
      const savedVars = [makeVar('HOST', 'https://saved.com')];
      const draftVars = [makeVar('HOST', 'https://draft-edit.com')];
      let state = makeInitialState(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      // Script didn't change HOST, but added TOKEN
      state = reducer(state, scriptEvent({
        HOST: 'https://saved.com',
        TOKEN: 'new-token',
        __name__: 'Test'
      }));

      const vars = getEnv(state).variables;
      // HOST should keep the draft value (script didn't change it)
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://draft-edit.com');
      // TOKEN should be added (new in script)
      expect(vars.find((v) => v.name === 'TOKEN').value).toBe('new-token');
      // Draft should be cleared
      expect(getCollection(state).environmentsDraft).toBeNull();
      // Baseline should be set
      expect(getCollection(state)._scriptEnvBaseline).toEqual({ HOST: 'https://saved.com' });
    });

    test('applies script modification over draft edit of same variable', () => {
      const savedVars = [makeVar('TOKEN', 'saved-token')];
      const draftVars = [makeVar('TOKEN', 'draft-token')];
      let state = makeInitialState(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      // Script changed TOKEN (different from saved)
      state = reducer(state, scriptEvent({ TOKEN: 'script-token', __name__: 'Test' }));

      // Script's change wins because it explicitly modified the value
      expect(getEnv(state).variables[0].value).toBe('script-token');
    });

    test('preserves draft-only variables that script does not know about', () => {
      const savedVars = [makeVar('HOST', 'https://saved.com')];
      const draftVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('NEW_DRAFT_VAR', 'draft-only-value')
      ];
      let state = makeInitialState(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      state = reducer(state, scriptEvent({ HOST: 'https://saved.com', __name__: 'Test' }));

      const vars = getEnv(state).variables;
      expect(vars).toHaveLength(2);
      expect(vars.find((v) => v.name === 'NEW_DRAFT_VAR').value).toBe('draft-only-value');
    });

    test('user deletes variable in draft, script returns same value — stays deleted', () => {
      const savedVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('API_KEY', 'saved-key')
      ];
      // User deleted API_KEY in the draft
      const draftVars = [makeVar('HOST', 'https://saved.com')];
      let state = makeInitialState(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      // Script returns API_KEY unchanged
      state = reducer(state, scriptEvent({
        HOST: 'https://saved.com',
        API_KEY: 'saved-key',
        __name__: 'Test'
      }));

      const vars = getEnv(state).variables;
      // API_KEY was not modified by script (same as baseline), so user's delete wins
      expect(vars.find((v) => v.name === 'API_KEY')).toBeUndefined();
      expect(vars).toHaveLength(1);
    });

    test('user deletes variable in draft, script sets new value — variable re-added', () => {
      const savedVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('API_KEY', 'saved-key')
      ];
      const draftVars = [makeVar('HOST', 'https://saved.com')];
      let state = makeInitialState(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      // Script explicitly changed API_KEY
      state = reducer(state, scriptEvent({
        HOST: 'https://saved.com',
        API_KEY: 'new-key-from-script',
        __name__: 'Test'
      }));

      const vars = getEnv(state).variables;
      expect(vars.find((v) => v.name === 'API_KEY').value).toBe('new-key-from-script');
    });

    test('ignores draft for non-active environment', () => {
      const savedVars = [makeVar('HOST', 'https://saved.com')];
      let state = makeInitialState(savedVars, {
        draft: { environmentUid: 'other-env-uid', variables: [makeVar('HOST', 'https://draft.com')] }
      });

      state = reducer(state, scriptEvent({ HOST: 'https://new.com', __name__: 'Test' }));

      // Draft for a different env should NOT be flushed
      expect(getCollection(state).environmentsDraft).not.toBeNull();
      // Should apply script output directly (no baseline)
      expect(getEnv(state).variables[0].value).toBe('https://new.com');
      expect(getCollection(state)._scriptEnvBaseline).toBeUndefined();
    });
  });

  describe('baseline exists — subsequent script events', () => {
    test('preserves draft edits across multiple script events', () => {
      const savedVars = [makeVar('HOST', 'https://saved.com')];
      const draftVars = [makeVar('HOST', 'https://draft.com')];
      let state = makeInitialState(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      // First event: flushes draft, creates baseline
      state = reducer(state, scriptEvent({
        HOST: 'https://saved.com',
        TOKEN: 'abc',
        __name__: 'Test'
      }));

      expect(getEnv(state).variables.find((v) => v.name === 'HOST').value).toBe('https://draft.com');
      expect(getEnv(state).variables.find((v) => v.name === 'TOKEN').value).toBe('abc');

      // Second event: baseline exists, no draft — should still preserve draft edits
      state = reducer(state, scriptEvent({
        HOST: 'https://saved.com',
        TOKEN: 'abc',
        __name__: 'Test'
      }));

      // HOST should still be the draft value
      expect(getEnv(state).variables.find((v) => v.name === 'HOST').value).toBe('https://draft.com');
      expect(getEnv(state).variables.find((v) => v.name === 'TOKEN').value).toBe('abc');
    });

    test('applies new changes from later script events', () => {
      const savedVars = [makeVar('HOST', 'https://saved.com')];
      const draftVars = [makeVar('HOST', 'https://draft.com')];
      let state = makeInitialState(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      // First event: pre-request sets TOKEN
      state = reducer(state, scriptEvent({
        HOST: 'https://saved.com',
        TOKEN: 'abc',
        __name__: 'Test'
      }));

      // Second event: post-response sets RESULT (new var)
      state = reducer(state, scriptEvent({
        HOST: 'https://saved.com',
        TOKEN: 'abc',
        RESULT: 'ok',
        __name__: 'Test'
      }));

      const vars = getEnv(state).variables;
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://draft.com');
      expect(vars.find((v) => v.name === 'TOKEN').value).toBe('abc');
      expect(vars.find((v) => v.name === 'RESULT').value).toBe('ok');
    });
  });

  describe('deleteEnvVar — script deletes a variable', () => {
    test('no draft: deleteEnvVar removes the variable', () => {
      let state = makeInitialState([
        makeVar('HOST', 'https://example.com'),
        makeVar('TOKEN', 'secret')
      ]);

      // Script called bru.deleteEnvVar("TOKEN") — TOKEN absent from output
      state = reducer(state, scriptEvent({ HOST: 'https://example.com', __name__: 'Test' }));

      expect(getEnv(state).variables).toHaveLength(1);
      expect(getEnv(state).variables[0].name).toBe('HOST');
    });

    test('with draft: deleteEnvVar removes variable that existed in saved state', () => {
      const savedVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('TOKEN', 'saved-token')
      ];
      const draftVars = [
        makeVar('HOST', 'https://draft.com'),
        makeVar('TOKEN', 'draft-token')
      ];
      let state = makeInitialState(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      // Script deleted TOKEN (absent from output)
      state = reducer(state, scriptEvent({ HOST: 'https://saved.com', __name__: 'Test' }));

      const vars = getEnv(state).variables;
      // TOKEN was in baseline and removed by script — should be gone
      expect(vars.find((v) => v.name === 'TOKEN')).toBeUndefined();
      // HOST draft value preserved (script didn't change it)
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://draft.com');
    });

    test('with draft: deleteEnvVar does not remove draft-only variables', () => {
      const savedVars = [makeVar('HOST', 'https://saved.com')];
      const draftVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('DRAFT_ONLY', 'user-added')
      ];
      let state = makeInitialState(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      // Script output only has HOST (DRAFT_ONLY was never in saved state)
      state = reducer(state, scriptEvent({ HOST: 'https://saved.com', __name__: 'Test' }));

      const vars = getEnv(state).variables;
      // DRAFT_ONLY should survive — it wasn't in baseline, so script can't "delete" it
      expect(vars.find((v) => v.name === 'DRAFT_ONLY').value).toBe('user-added');
    });
  });

  describe('deleteAllEnvVars — script clears all variables', () => {
    test('no draft: deleteAllEnvVars removes all enabled variables', () => {
      let state = makeInitialState([
        makeVar('HOST', 'https://example.com'),
        makeVar('TOKEN', 'secret'),
        makeVar('DISABLED', 'keep', false)
      ]);

      // Script called bru.deleteAllEnvVars() — only __name__ remains
      state = reducer(state, scriptEvent({ __name__: 'Test' }));

      const vars = getEnv(state).variables;
      // Only disabled var survives
      expect(vars).toHaveLength(1);
      expect(vars[0].name).toBe('DISABLED');
    });

    test('with draft: deleteAllEnvVars removes saved vars but keeps draft-only vars', () => {
      const savedVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('TOKEN', 'saved-token')
      ];
      const draftVars = [
        makeVar('HOST', 'https://draft.com'),
        makeVar('TOKEN', 'draft-token'),
        makeVar('DRAFT_ONLY', 'user-added')
      ];
      let state = makeInitialState(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      // Script called bru.deleteAllEnvVars() — only __name__ in output
      state = reducer(state, scriptEvent({ __name__: 'Test' }));

      const vars = getEnv(state).variables;
      // HOST and TOKEN were in baseline and deleted by script — gone
      expect(vars.find((v) => v.name === 'HOST')).toBeUndefined();
      expect(vars.find((v) => v.name === 'TOKEN')).toBeUndefined();
      // DRAFT_ONLY was not in baseline — survives
      expect(vars.find((v) => v.name === 'DRAFT_ONLY').value).toBe('user-added');
    });

    test('with draft: deleteAllEnvVars preserves disabled variables', () => {
      const savedVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('DISABLED', 'keep', false)
      ];
      const draftVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('DISABLED', 'keep', false)
      ];
      let state = makeInitialState(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      state = reducer(state, scriptEvent({ __name__: 'Test' }));

      const vars = getEnv(state).variables;
      expect(vars).toHaveLength(1);
      expect(vars[0].name).toBe('DISABLED');
      expect(vars[0].enabled).toBe(false);
    });
  });

  describe('mixed operations — set + delete in same script', () => {
    test('no draft: script adds new var and deletes existing var', () => {
      let state = makeInitialState([
        makeVar('HOST', 'https://example.com'),
        makeVar('OLD_TOKEN', 'remove-me')
      ]);

      // Script deleted OLD_TOKEN and added NEW_TOKEN
      state = reducer(state, scriptEvent({
        HOST: 'https://example.com',
        NEW_TOKEN: 'fresh',
        __name__: 'Test'
      }));

      const vars = getEnv(state).variables;
      expect(vars.find((v) => v.name === 'OLD_TOKEN')).toBeUndefined();
      expect(vars.find((v) => v.name === 'NEW_TOKEN').value).toBe('fresh');
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://example.com');
    });

    test('with draft: script adds, modifies, and deletes vars — draft edits preserved', () => {
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
      let state = makeInitialState(savedVars, {
        draft: { environmentUid: ENV_UID, variables: draftVars }
      });

      // Script: modified TOKEN, deleted TO_DELETE, added SCRIPT_NEW, left HOST unchanged
      state = reducer(state, scriptEvent({
        HOST: 'https://saved.com',
        TOKEN: 'script-token',
        SCRIPT_NEW: 'from-script',
        __name__: 'Test'
      }));

      const vars = getEnv(state).variables;
      // HOST: unchanged by script → draft value preserved
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://draft.com');
      // TOKEN: modified by script → script wins
      expect(vars.find((v) => v.name === 'TOKEN').value).toBe('script-token');
      // TO_DELETE: was in baseline, absent from script → deleted
      expect(vars.find((v) => v.name === 'TO_DELETE')).toBeUndefined();
      // DRAFT_NEW: not in baseline → preserved
      expect(vars.find((v) => v.name === 'DRAFT_NEW').value).toBe('from-user');
      // SCRIPT_NEW: new from script → added
      expect(vars.find((v) => v.name === 'SCRIPT_NEW').value).toBe('from-script');
    });
  });

  describe('baseline cleanup', () => {
    test('initRunRequestEvent clears baseline from previous request', () => {
      let state = makeInitialState([makeVar('HOST', 'https://saved.com')], {
        baseline: { HOST: 'https://saved.com' }
      });

      state = reducer(state, initRunRequestEvent({
        requestUid: REQUEST_UID,
        itemUid: ITEM_UID,
        collectionUid: COLLECTION_UID
      }));

      expect(getCollection(state)._scriptEnvBaseline).toBeUndefined();
    });
  });

  describe('typed values — dataType inference', () => {
    test('infers number dataType when script sets a numeric value', () => {
      let state = makeInitialState([makeVar('COUNT', '0')]);

      state = reducer(state, scriptEvent({ COUNT: 42, __name__: 'Test' }));

      const v = getEnv(state).variables.find((v) => v.name === 'COUNT');
      expect(v.value).toBe(42);
      expect(v.dataType).toBe('number');
    });

    test('infers boolean dataType when script sets a boolean value', () => {
      let state = makeInitialState([makeVar('FLAG', 'false')]);

      state = reducer(state, scriptEvent({ FLAG: true, __name__: 'Test' }));

      const v = getEnv(state).variables.find((v) => v.name === 'FLAG');
      expect(v.value).toBe(true);
      expect(v.dataType).toBe('boolean');
    });

    test('infers object dataType when script sets an object value', () => {
      let state = makeInitialState([makeVar('CONFIG', '')]);

      state = reducer(state, scriptEvent({ CONFIG: { port: 3000 }, __name__: 'Test' }));

      const v = getEnv(state).variables.find((v) => v.name === 'CONFIG');
      expect(v.value).toEqual({ port: 3000 });
      expect(v.dataType).toBe('object');
    });

    test('keeps existing dataType on a typed var the script did not touch', () => {
      const typedVar = { ...makeVar('COUNT', 42), dataType: 'number' };
      let state = makeInitialState([
        typedVar,
        makeVar('HOST', 'https://example.com')
      ]);

      // Script touched HOST only; the runtime payload still carries COUNT (unchanged).
      state = reducer(state, scriptEvent({ COUNT: 42, HOST: 'https://new.com', __name__: 'Test' }));

      const v = getEnv(state).variables.find((v) => v.name === 'COUNT');
      expect(v.dataType).toBe('number');
    });

    test('drops dataType when script replaces a typed value with a string', () => {
      const typedVar = { ...makeVar('COUNT', 42), dataType: 'number' };
      let state = makeInitialState([typedVar]);

      state = reducer(state, scriptEvent({ COUNT: 'not-a-number', __name__: 'Test' }));

      const v = getEnv(state).variables.find((v) => v.name === 'COUNT');
      expect(v.dataType).toBeUndefined();
    });

    test('updates dataType when script changes the value type', () => {
      const typedVar = { ...makeVar('VAL', 42), dataType: 'number' };
      let state = makeInitialState([typedVar]);

      state = reducer(state, scriptEvent({ VAL: true, __name__: 'Test' }));

      const v = getEnv(state).variables.find((v) => v.name === 'VAL');
      expect(v.value).toBe(true);
      expect(v.dataType).toBe('boolean');
    });
  });

  describe('object/array typed-var no-op writes preserve draft (deep-equal compare)', () => {
    test('script re-writing a structurally-equal object value does NOT clobber draft edit', () => {
      const savedVar = { ...makeVar('CFG', { port: 3000 }), dataType: 'object' };
      const draftVar = { ...makeVar('CFG', { port: 4000 }), dataType: 'object' };

      let state = makeInitialState([savedVar], {
        draft: { environmentUid: ENV_UID, variables: [draftVar] }
      });

      // Script reads CFG (={port:3000}), passes it back unchanged. Pre-fix the strict-!==
      // compare in applyScriptEnvVars saw two different references and clobbered the draft.
      state = reducer(state, scriptEvent({ CFG: { port: 3000 }, __name__: 'Test' }));

      const v = getEnv(state).variables.find((v) => v.name === 'CFG');
      expect(v.value).toEqual({ port: 4000 });
    });

    test('script re-writing a structurally-equal array value does NOT clobber draft edit', () => {
      const savedVar = { ...makeVar('TAGS', [1, 2]), dataType: 'array' };
      const draftVar = { ...makeVar('TAGS', [1, 2, 3]), dataType: 'array' };

      let state = makeInitialState([savedVar], {
        draft: { environmentUid: ENV_UID, variables: [draftVar] }
      });

      state = reducer(state, scriptEvent({ TAGS: [1, 2], __name__: 'Test' }));

      const v = getEnv(state).variables.find((v) => v.name === 'TAGS');
      expect(v.value).toEqual([1, 2, 3]);
    });

    test('dataType inference is NOT applied when the merge skipped the var (no-op write)', () => {
      // User is mid-edit converting `42` (number) → `'forty-two'` (string) in their draft.
      const savedVar = { ...makeVar('COUNT', 42), dataType: 'number' };
      const draftVar = { ...makeVar('COUNT', 'forty-two') };

      let state = makeInitialState([savedVar], {
        draft: { environmentUid: ENV_UID, variables: [draftVar] }
      });

      // Script does a no-op write of the saved value. With the modifiedKeys-scoped inference,
      // we must NOT reset the dataType back to 'number' — the draft's string-typed edit is preserved.
      state = reducer(state, scriptEvent({ COUNT: 42, __name__: 'Test' }));

      const v = getEnv(state).variables.find((v) => v.name === 'COUNT');
      expect(v.value).toBe('forty-two');
      expect(v.dataType).toBeUndefined();
    });
  });

  describe('disabled-var name collision — script targets enabled slot only', () => {
    test('script setting X writes to the enabled X, leaves the disabled X untouched', () => {
      const disabledX = makeVar('X', 'archived', false);
      const enabledX = makeVar('X', 'current');

      let state = makeInitialState([disabledX, enabledX]);

      state = reducer(state, scriptEvent({ X: 'updated', __name__: 'Test' }));

      const xVars = getEnv(state).variables.filter((v) => v.name === 'X');
      expect(xVars).toHaveLength(2);
      const stillDisabled = xVars.find((v) => v.enabled === false);
      const nowEnabled = xVars.find((v) => v.enabled === true);
      expect(stillDisabled.value).toBe('archived');
      expect(nowEnabled.value).toBe('updated');
    });

    test('when only a disabled X exists, the script write creates a NEW enabled slot', () => {
      const disabledOnly = makeVar('X', 'archived', false);

      let state = makeInitialState([disabledOnly]);

      state = reducer(state, scriptEvent({ X: 'created', __name__: 'Test' }));

      const xVars = getEnv(state).variables.filter((v) => v.name === 'X');
      expect(xVars).toHaveLength(2);
      expect(xVars.find((v) => v.enabled === false).value).toBe('archived');
      expect(xVars.find((v) => v.enabled === true).value).toBe('created');
    });
  });
});
