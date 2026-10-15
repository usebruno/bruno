import { getStaticPropertyName, reportUntranslated } from '../ast-utils';
import { getExpressionType } from './type-environment';

/**
 * Rebuilds the access under a new member name, keeping it optional when it already was.
 * `jar?.get(...)` short-circuits on a missing jar, and a plain member expression in its
 * place would throw where the original returned undefined.
 *
 * The parser spells an optional access as a MemberExpression carrying `optional`, not as a
 * node type of its own, so the flag is copied rather than the builder being swapped.
 */
const buildMember = (j, node, memberName) => {
  const member = j.memberExpression(node.object, j.identifier(memberName));
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
 * A member the registry marks unsupported is left as it stands, so it reads in the output
 * exactly like a member something else was renamed onto — which is why reaching one is
 * reported.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} root - jscodeshift Collection to search within
 * @param {Array} bindings - Typed bindings in scope
 * @param {Object} registry - The API registry
 */
const rewriteMembers = (j, root, bindings, registry) => {
  const targets = root
    .find(j.MemberExpression)
    .paths()
    .map((path) => {
      const receiverType = getExpressionType(path.get('object'), bindings, registry);
      if (!receiverType) return null;

      const members = registry.types[receiverType];
      const propertyName = getStaticPropertyName(path.value);
      const spec = propertyName && members && members[propertyName];

      return spec ? { path, propertyName, spec } : null;
    })
    .filter(Boolean);

  targets.forEach(({ path, propertyName, spec }) => {
    // a member with no counterpart is left exactly as it stands, and reported
    if (spec.unsupported) {
      reportUntranslated(path.value, propertyName, spec.unsupported);
      return;
    }

    const replacement = buildMember(j, path.value, spec.to);

    const parent = path.parent;
    const isMethodCall
      = parent.value.type === 'CallExpression' && parent.value.callee === path.value;

    // A member that is a method on one side and a plain property on the other changes arity
    // along with its name: `res.json()` -> `res.data` drops the call, `res.data` -> `res.json()`
    // adds one back.
    if (spec.call === 'drop' && isMethodCall) {
      j(parent).replaceWith(replacement);
    } else if (spec.call === 'add' && !isMethodCall) {
      j(path).replaceWith(j.callExpression(replacement, []));
    } else {
      j(path).replaceWith(replacement);
    }
  });
};

export default rewriteMembers;
