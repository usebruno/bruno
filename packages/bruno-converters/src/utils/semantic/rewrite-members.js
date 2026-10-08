import { getStaticPropertyName, warnOnStatement } from '../ast-utils';
import { resolvesToBinding } from './type-environment';

/**
 * Rebuilds the access under a new member name, keeping it optional when it already was.
 * `jar?.get(...)` short-circuits on a missing jar, and a plain member expression in its
 * place would throw where the original returned undefined.
 *
 * The parser spells an optional access as a MemberExpression carrying `optional`, not as a
 * node type of its own, so the flag is copied rather than the builder being swapped.
 */
const buildMember = (j, node, objectName, memberName) => {
  const member = j.memberExpression(j.identifier(objectName), j.identifier(memberName));
  member.optional = Boolean(node.optional);

  return member;
};

/**
 * Rewrites member access on a typed binding to the equivalent the registry declares.
 *
 * Matching paths are collected before any replacement is applied. Some maps rename one
 * member onto another member's name — `code -> status` alongside `status -> statusText` —
 * so a pass that replaced as it walked would re-match what it had just written.
 *
 * A member the registry marks unsupported is left as it stands and its statement flagged.
 * That is what keeps it apart from a member another one is renamed onto: `jar.clear()` in
 * the output is the translation of `deleteCookies`, and the untranslatable Bruno `clear`
 * is the one carrying a comment.
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
    const propertyName = getStaticPropertyName(memberPath.value);
    const spec = members[propertyName];

    if (spec.unsupported) {
      warnOnStatement(j, memberPath, `bruno-converter: ${propertyName} — ${spec.unsupported}`);
      return;
    }

    const replacement = buildMember(j, memberPath.value, binding.name, spec.to);

    const parent = memberPath.parent;
    const isMethodCall
      = parent.value.type === 'CallExpression' && parent.value.callee === memberPath.value;

    // A member that is a method on one side and a plain property on the other changes arity
    // along with its name: `res.json()` -> `res.data` drops the call, `res.data` -> `res.json()`
    // adds one back.
    if (spec.call === 'drop' && isMethodCall) {
      j(parent).replaceWith(replacement);
    } else if (spec.call === 'add' && !isMethodCall) {
      j(memberPath).replaceWith(j.callExpression(replacement, []));
    } else {
      j(memberPath).replaceWith(replacement);
    }
  });
};

export default rewriteMembers;
