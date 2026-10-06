import POSTMAN_REGISTRY from './postman-registry';
import { collectBindings } from './type-environment';
import rewriteMembers from './rewrite-members';

/**
 * Translates member access on values whose correct translation depends on what the value
 * holds rather than on how the access is spelled.
 *
 * `simpleTranslations` can only match a fixed dotted path, and `preprocessAliases` resolves
 * aliases by substituting the aliased expression at each use site — which works for static
 * globals like `pm.response` but not for the result of a call, since a call with side effects
 * cannot be duplicated. This pass types the binding instead of erasing it:
 *
 *   const r = await pm.sendRequest(req);   ->   const r = await bru.sendRequest(req);
 *   r.code                                 ->   r.status
 *   r.json()                               ->   r.data
 *
 * Runs before `processTransformations`, so the registry is keyed on Postman's names while
 * they are still Postman's.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} ast - jscodeshift Collection
 * @param {Object} [registry] - The API registry, defaulting to Postman's
 */
export const applySemanticTypes = (j, ast, registry = POSTMAN_REGISTRY) => {
  collectBindings(j, ast, registry).forEach((binding) => {
    rewriteMembers(j, ast, binding, registry);
  });
};

export { default as POSTMAN_REGISTRY } from './postman-registry';
export { default as BRUNO_REGISTRY } from './bruno-registry';
export { default as rewriteMembers } from './rewrite-members';
export { resolvesToBinding } from './type-environment';
