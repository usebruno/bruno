import { getStaticPropertyName } from '../ast-utils';
import { resolvesToBinding } from './type-environment';

/**
 * Rewrites member access on a typed binding to the Bruno equivalent the registry declares.
 *
 * Matching paths are collected before any replacement is applied. Some maps rename one
 * member onto another member's name — `code -> status` alongside `status -> statusText` —
 * so a pass that replaced as it walked would re-match what it had just written.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} root - jscodeshift Collection to search within
 * @param {Object} binding - { name, scopeNode, typeName }
 * @param {Object} registry - The API registry
 */
const rewriteMembers = (j, root, binding, registry) => {
  const members = registry.types[binding.typeName];
  if (!members) return;

  const targets = root
    .find(j.MemberExpression, { object: { type: 'Identifier', name: binding.name } })
    .paths()
    .filter((path) => {
      const propertyName = getStaticPropertyName(path.value);
      if (!propertyName || !members[propertyName]) return false;

      // leave references shadowed by another declaration of the name alone
      return resolvesToBinding(path, binding);
    });

  targets.forEach((memberPath) => {
    const spec = members[getStaticPropertyName(memberPath.value)];
    const replacement = j.memberExpression(j.identifier(binding.name), j.identifier(spec.to));

    const parent = memberPath.parent;
    const isMethodCall
      = parent.value.type === 'CallExpression' && parent.value.callee === memberPath.value;

    // a member that is a method in the source API but a plain property in Bruno loses its
    // parentheses along with its name: `res.json()` -> `res.data`
    if (spec.call === 'drop' && isMethodCall) {
      j(parent).replaceWith(replacement);
    } else {
      j(memberPath).replaceWith(replacement);
    }
  });
};

export default rewriteMembers;
