import { getStaticPropertyName } from '../ast-utils';
import COERCIONS from './coercions';
import { getExpressionType } from './type-environment';

const isFunction = (node) =>
  node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';

/**
 * Adapts what a typed member yields, where the two APIs agree on the member but not on the
 * shape of the value behind it.
 *
 * The adaptation goes where the value is produced, not at the places it is later read, so one
 * edit makes every later use correct and no reference needs to be found or scope-checked:
 *
 *   const v = await jar.get(url, name);  ->  const v = (await jar.get(url, name)).value;
 *
 * Runs before the members are renamed, so the registry is still keyed on the names the
 * script arrived with.
 *
 * Three shapes leave nowhere to put the expression, and each is left as written: a plain
 * property, which has no call to hang it off; a method handed a callback, where the value
 * arrives as a parameter; and a result nothing observes.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} root - jscodeshift Collection to search within
 * @param {Array} bindings - Typed bindings in scope
 * @param {Object} registry - The API registry
 */
const rewriteYields = (j, root, bindings, registry) => {
  const targets = root
    .find(j.MemberExpression)
    .paths()
    .map((path) => {
      const receiverType = getExpressionType(path.get('object'), bindings, registry);
      if (!receiverType) return null;

      const members = registry.types[receiverType];
      const propertyName = getStaticPropertyName(path.value);
      const spec = propertyName && members && members[propertyName];
      const coercion = spec && spec.yields && spec.yields.coerce;

      return coercion ? { path, coercion: COERCIONS[coercion] } : null;
    })
    .filter(Boolean);

  targets.forEach(({ path: memberPath, coercion }) => {
    const parent = memberPath.parent;
    const isMethodCall = parent.value.type === 'CallExpression' && parent.value.callee === memberPath.value;

    if (!isMethodCall) return;
    if (parent.value.arguments.some(isFunction)) return;

    // the value to adapt is what the `await` produces, not the promise it produces it from
    const produced = parent.parent.value.type === 'AwaitExpression' ? parent.parent : parent;
    if (produced.parent.value.type === 'ExpressionStatement') return;

    j(produced).replaceWith(coercion.build(j, produced.value));
  });
};

export default rewriteYields;
