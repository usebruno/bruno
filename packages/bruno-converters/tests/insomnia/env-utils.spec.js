import { describe, it, expect } from '@jest/globals';
import { buildV5Environments, buildV4Environments, normalizeVariables } from '../../src/insomnia/env-utils';

const getVar = (env, name) => {
  return env.variables.find((v) => v.name === name);
};

describe('env-utils', () => {
  describe('normalizeVariables', () => {
    it('removes the leading `_.` from Insomnia variable references', () => {
      expect(normalizeVariables('{{_.baseUrl}}')).toBe('{{baseUrl}}');
    });

    it('removes spaces inside the variable name', () => {
      expect(normalizeVariables('{{_.user name}}')).toBe('{{username}}');
    });

    it('normalizes references embedded in a larger string', () => {
      expect(normalizeVariables('https://api.example.com/{{_.host}}/v1')).toBe(
        'https://api.example.com/{{host}}/v1'
      );
    });

    it('normalizes multiple references in the same value', () => {
      expect(normalizeVariables('{{_.a}}/{{_. b}}')).toBe('{{a}}/{{b}}');
    });

    it('returns strings without variable references unchanged', () => {
      expect(normalizeVariables('plain string')).toBe('plain string');
    });

    it('coerces non-string values and handles empty values', () => {
      expect(normalizeVariables(123)).toBe('123');
      expect(normalizeVariables(null)).toBe('');
      expect(normalizeVariables(undefined)).toBe('');
    });
  });

  describe('buildV5Environments', () => {
    it('creates base and sub environments with flattened keys and shallow overrides', () => {
      const environmentsNode = {
        name: 'Base',
        data: {
          baseurl: 'https://api.example.com',
          nested: { name: 'alice', roles: ['admin'] },
          numbers: [1, 2]
        },
        subEnvironments: [
          {
            name: 'Staging',
            data: {
              baseurl: 'https://staging.example.com',
              nested: { name: 'bob' }
            }
          },
          { name: 'Dev', data: {} }
        ]
      };

      const envs = buildV5Environments(environmentsNode);
      expect(envs.length).toBe(3);

      const base = envs[0];
      const staging = envs[1];
      const dev = envs[2];

      expect(base.name).toBe('Base');
      expect(getVar(base, 'baseurl')?.value).toBe('https://api.example.com');
      expect(getVar(base, 'nested.name')?.value).toBe('alice');
      expect(getVar(base, 'nested.roles[0]')?.value).toBe('admin');
      expect(getVar(base, 'numbers[1]')?.value).toBe('2');

      expect(staging.name).toBe('Staging');
      // baseurl overridden in sub
      expect(getVar(staging, 'baseurl')?.value).toBe('https://staging.example.com');
      // nested.name overridden, nested array preserved from base
      expect(getVar(staging, 'nested.name')?.value).toBe('bob');
      expect(getVar(staging, 'nested.roles[0]')?.value).toBe('admin');

      expect(dev.name).toBe('Dev');
      // no sub data => inherits base
      expect(getVar(dev, 'baseurl')?.value).toBe('https://api.example.com');
      expect(getVar(dev, 'nested.name')?.value).toBe('alice');
    });
  });

  describe('buildV4Environments', () => {
    it('merges nearest base and sub env data (flattened) into standalone Bruno envs', () => {
      const workspaceId = 'wrk_1';
      const resources = [
        { _id: workspaceId, _type: 'workspace', name: 'WS' },
        {
          _id: 'env_base',
          _type: 'environment',
          parentId: workspaceId,
          name: 'Base',
          data: {
            baseurl: 'https://api.example.com',
            user: { name: 'alice' },
            arr: [{ id: 1 }]
          }
        },
        {
          _id: 'env_sub',
          _type: 'environment',
          parentId: 'env_base',
          name: 'Sub',
          data: {
            user: { name: 'bob' }
          }
        }
      ];

      const envs = buildV4Environments(resources, workspaceId);
      expect(envs.length).toBe(2);

      const base = envs.find((e) => e.name === 'Base');
      const sub = envs.find((e) => e.name === 'Sub');

      expect(getVar(base, 'baseurl')?.value).toBe('https://api.example.com');
      expect(getVar(base, 'user.name')?.value).toBe('alice');
      expect(getVar(base, 'arr[0].id')?.value).toBe('1');

      // sub should inherit base, override user.name
      expect(getVar(sub, 'baseurl')?.value).toBe('https://api.example.com');
      expect(getVar(sub, 'user.name')?.value).toBe('bob');
      expect(getVar(sub, 'arr[0].id')?.value).toBe('1');
    });
  });
});
