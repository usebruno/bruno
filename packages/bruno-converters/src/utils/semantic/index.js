import CORRESPONDENCE from './correspondence';
import derive from './derive';
import { collectBindings, resolvesToBinding } from './type-environment';
import rewriteMembers from './rewrite-members';
import rewriteYields from './rewrite-yields';
import { rewriteDestructuredDeclarations, rewritePattern } from './rewrite-patterns';

/**
 * Both directions are derived from the one correspondence table, so neither can carry a
 * mapping the other lacks.
 */
export const POSTMAN_REGISTRY = derive(CORRESPONDENCE, 'pm');
export const BRUNO_REGISTRY = derive(CORRESPONDENCE, 'bru');

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
 * Yields are adapted before members are renamed, so both read the registry under the names
 * the script arrived with.
 *
 * Runs before `processTransformations`, so those names are still the source API's.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} ast - jscodeshift Collection
 * @param {Object} registry - The API registry for the direction being translated
 */
export const applySemanticTypes = (j, ast, registry) => {
  collectBindings(j, ast, registry).forEach((binding) => {
    rewriteYields(j, ast, binding, registry);
    rewriteMembers(j, ast, binding, registry);
  });

  rewriteDestructuredDeclarations(j, ast, registry);
};

export { rewriteMembers, rewritePattern, resolvesToBinding };
