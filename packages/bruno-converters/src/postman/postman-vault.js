import { invalidVariableCharacterRegex } from '../constants/index';

const vaultReferenceRegex = /\{\{vault:([^}]+)\}\}/g;

/**
 * Postman vault references carry a colon, which the .bru env grammar reads as the name/value
 * separator - a variable named `vault:token` truncates to `vault` on the next read and swallows
 * the rest into the value. Sanitizing the whole reference folds the colon into a `vault_` prefix,
 * which also keeps an imported key from colliding with a plain variable of the same bare name.
 */
export const mangleVaultKey = (key) => `vault:${key}`.replace(invalidVariableCharacterRegex, '_');

export const detectPostmanVaultKeys = (collection) => {
  const keys = new Set();
  const visited = new WeakSet();

  const scan = (node) => {
    if (typeof node === 'string') {
      for (const match of node.matchAll(vaultReferenceRegex)) {
        keys.add(match[1]);
      }
      return;
    }

    if (!node || typeof node !== 'object' || visited.has(node)) {
      return;
    }

    visited.add(node);
    Object.values(node).forEach(scan);
  };

  scan(collection);

  return [...keys].sort().map((key) => ({ key, name: mangleVaultKey(key) }));
};

export const rewriteVaultReferences = (collection) => {
  const clones = new Map();

  const rewrite = (node) => {
    if (typeof node === 'string') {
      return node.replace(vaultReferenceRegex, (_match, key) => `{{${mangleVaultKey(key)}}}`);
    }

    if (!node || typeof node !== 'object') {
      return node;
    }

    if (clones.has(node)) {
      return clones.get(node);
    }

    const clone = Array.isArray(node) ? [] : {};
    clones.set(node, clone);
    Object.entries(node).forEach(([key, value]) => {
      clone[key] = rewrite(value);
    });

    return clone;
  };

  return rewrite(collection);
};
