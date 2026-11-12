import { getProducedType } from './type-environment';

/**
 * Rewrites the keys of a destructuring pattern that unpacks a typed value, aliasing each
 * renamed member back to the name the script already uses:
 *
 *   const { code } = await pm.sendRequest(q)  ->  const { status: code } = await bru.sendRequest(q)
 *
 * No scope tracking is involved. The rename stays inside the pattern and the local names
 * are untouched, so every later reference keeps working without being visited at all.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} pattern - ObjectPattern node unpacking the typed value
 * @param {string} typeName - Registry type of the value being unpacked
 * @param {Object} registry - The API registry
 */
export const rewritePattern = (j, pattern, typeName, registry) => {
  const members = registry.types[typeName];
  if (!members) return;

  /**
   * A rest element collects whatever the named properties leave behind, and those leftovers
   * are the target API's members rather than the source's. Renaming its siblings would
   * change which of them it receives, so the pattern is left whole.
   */
  if (pattern.properties.some((property) => property.type === 'RestElement')) return;

  pattern.properties.forEach((property) => {
    if (property.type !== 'Property' || property.computed) return;
    if (property.key.type !== 'Identifier') return;

    // a nested pattern unpacks members of a value the registry carries no type for
    if (property.value.type === 'ObjectPattern' || property.value.type === 'ArrayPattern') return;

    const spec = members[property.key.name];
    if (!spec) return;

    /**
     * A member that is a method on one side and a plain property on the other can't be
     * renamed here — `const { data: json } = res` would leave `json()` calling a value.
     */
    if (spec.call) return;

    property.key = j.identifier(spec.to);

    // Without this the printer collapses `{ status: code }` back to the shorthand `{ status }`,
    // renaming the local variable along with the member and breaking every reference to it.
    property.shorthand = false;
  });
};

/**
 * Rewrites every destructuring declaration that unpacks a value the registry can type.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} ast - jscodeshift Collection
 * @param {Object} registry - The API registry
 */
export const rewriteDestructuredDeclarations = (j, ast, registry) => {
  ast.find(j.VariableDeclarator).forEach((path) => {
    if (path.value.id.type !== 'ObjectPattern' || !path.value.init) return;

    const typeName = getProducedType(path.value.init, registry);
    if (!typeName) return;

    rewritePattern(j, path.value.id, typeName, registry);
  });
};
