const { describe, it, expect } = require('@jest/globals');
const { interpolate } = require('@usebruno/common');
const { mergeVars } = require('../../src/utils/collection');

/**
 * Regression test for https://github.com/usebruno/bruno/issues/7227
 * "Dynamic variables in vars:pre-request are re-evaluated on each reference"
 *
 * Electron (desktop app) pipeline equivalent of the CLI regression test:
 * a pre-request var like `myRandomValue: {{$randomWords}}` must be evaluated
 * ONCE when the var is materialized for a request run. When the raw `{{$...}}`
 * placeholder is left in the stored value, every later interpolation
 * (request body, assertions, bru.getVar()) re-runs the faker expression, so
 * each reference sees a different random value and assertions mismatch.
 */

const buildTreePath = (vars) => [
  {
    type: 'request',
    request: {
      vars: {
        req: vars
      }
    }
  }
];

// mirrors the combinedVars the electron runner builds for body / assertion / bru paths
const interpolateAsRunner = (str, request) =>
  interpolate(str, {
    ...(request.collectionVariables || {}),
    ...(request.folderVariables || {}),
    ...(request.requestVariables || {})
  });

describe('issue #7227: dynamic variables in vars:pre-request evaluate once (electron)', () => {
  it('evaluates {{$...}} once at materialization; body and assertion references agree', () => {
    const request = { vars: {} };
    mergeVars(
      { root: {} },
      request,
      buildTreePath([{ name: 'myRandomValue', value: '{{$randomWords}}', enabled: true }])
    );

    // simulate the two interpolation passes of a request run:
    // 1. request body, 2. assertions / bru.getVar()
    // on the buggy base these differ: each reference re-evaluates the faker expression
    const bodyValue = interpolateAsRunner('{{myRandomValue}}', request);
    const assertValue = interpolateAsRunner('{{myRandomValue}}', request);
    expect(assertValue).toBe(bodyValue);

    const materialized = request.requestVariables.myRandomValue;
    // the raw placeholder must not survive materialization
    expect(materialized).not.toContain('{{$');
    expect(bodyValue).toBe(materialized);
  });

  it('keeps ordinary {{var}} references late-bound (per #6823)', () => {
    const request = { vars: {} };
    mergeVars(
      { root: {} },
      request,
      buildTreePath([{ name: 'plainRef', value: '{{otherVar}}', enabled: true }])
    );

    // must stay verbatim so it resolves against the latest values at reference time
    expect(request.requestVariables.plainRef).toBe('{{otherVar}}');
    expect(interpolateAsRunner('{{plainRef}}', request)).toBe('{{otherVar}}');
    expect(
      interpolate('{{plainRef}}', {
        ...(request.requestVariables || {}),
        otherVar: 'LATEST'
      })
    ).toBe('LATEST');
  });

  it('resolves mixed content and leaves unknown {{$...}} keywords alone', () => {
    const request = { vars: {} };
    mergeVars(
      { root: {} },
      request,
      buildTreePath([
        { name: 'mixed', value: 'id-{{$guid}}', enabled: true },
        { name: 'weird', value: '{{$notARealKeyword}}', enabled: true },
        { name: 'static', value: 'hello', enabled: true }
      ])
    );

    expect(request.requestVariables.mixed).toMatch(/^id-[0-9a-f-]{36}$/);
    expect(request.requestVariables.weird).toBe('{{$notARealKeyword}}');
    expect(request.requestVariables.static).toBe('hello');
    const first = interpolateAsRunner('{{mixed}}', request);
    const second = interpolateAsRunner('{{mixed}}', request);
    expect(first).toBe(second);
  });

  it('resolves collection-level and folder-level pre-request vars once', () => {
    const request = { vars: {} };
    const collection = {
      root: {
        request: {
          vars: { req: [{ name: 'collVar', value: '{{$guid}}', enabled: true }] }
        }
      }
    };
    const treePath = [
      {
        type: 'folder',
        root: {
          request: {
            vars: { req: [{ name: 'folderVar', value: '{{$guid}}', enabled: true }] }
          }
        }
      },
      ...buildTreePath([])
    ];
    mergeVars(collection, request, treePath);

    for (const name of ['collVar', 'folderVar']) {
      const map = name === 'collVar' ? request.collectionVariables : request.folderVariables;
      expect(map[name]).not.toContain('{{$');
      expect(interpolateAsRunner(`{{${name}}}`, request)).toBe(map[name]);
    }
  });

  it('ignores disabled vars and stores the resolved value in request.vars.req', () => {
    const request = { vars: {} };
    mergeVars(
      { root: {} },
      request,
      buildTreePath([
        { name: 'myRandomValue', value: '{{$randomWords}}', enabled: true },
        { name: 'off', value: '{{$guid}}', enabled: false }
      ])
    );

    expect(request.requestVariables.off).toBeUndefined();
    const entry = request.vars.req.find((v) => v.name === 'myRandomValue');
    expect(entry).toBeDefined();
    expect(entry.value).not.toContain('{{$');
    expect(entry.value).toBe(request.requestVariables.myRandomValue);
  });
});
