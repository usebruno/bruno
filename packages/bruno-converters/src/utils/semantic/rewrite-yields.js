import { getStaticPropertyName, warnOnStatement } from '../ast-utils';
import COERCIONS from './coercions';
import { resolvesToBinding } from './type-environment';

const isFunction = (node) =>
  node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';

/**
 * Adapts what a typed binding's members yield, where the two APIs agree on the member but not
 * on the shape of the value behind it.
 *
 * The adaptation goes where the value is produced, not at the places it is later read, so one
 * edit makes every later use correct and no reference needs to be found or scope-checked:
 *
 *   const v = await jar.get(url, name);  ->  const v = (await jar.get(url, name)).value;
 *
 * Runs before the members are renamed, so the registry is still keyed on the names the
 * script arrived with.
 *
 * A yielded value is only worth adapting where it is read, which is what separates the cases:
 *   - a method handed a callback — flagged, since the value arrives as a parameter and an
 *     expression has nowhere to go
 *   - a method whose result is used — coerced, or flagged when no expression bridges the shapes
 *   - a method whose result is discarded — left alone; nothing observes the difference
 *   - a plain property — flagged, since there is no call to hang a coercion off
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} root - jscodeshift Collection to search within
 * @param {Object} binding - { name, scopeNode, typeName }
 * @param {Object} registry - The API registry
 */
const rewriteYields = (j, root, binding, registry) => {
  const members = registry.types[binding.typeName];
  if (!members) return;

  const targets = root
    .find(j.MemberExpression, { object: { type: 'Identifier', name: binding.name } })
    .paths()
    .filter((path) => {
      const propertyName = getStaticPropertyName(path.value);
      const spec = propertyName && members[propertyName];

      return Boolean(spec && spec.yields) && resolvesToBinding(path, binding);
    });

  targets.forEach((memberPath) => {
    const { yields } = members[getStaticPropertyName(memberPath.value)];
    const coercion = yields.coerce && COERCIONS[yields.coerce];
    const warn = (path) => warnOnStatement(j, path, `bruno-converter: ${yields.lost || coercion.describes}`);

    const parent = memberPath.parent;
    const isMethodCall = parent.value.type === 'CallExpression' && parent.value.callee === memberPath.value;

    // a property carries its value directly, leaving nowhere to hang a coercion
    if (!isMethodCall) {
      warn(memberPath);
      return;
    }

    if (parent.value.arguments.some(isFunction)) {
      warn(parent);
      return;
    }

    // the value to adapt is what the `await` produces, not the promise it produces it from
    const produced = parent.parent.value.type === 'AwaitExpression' ? parent.parent : parent;
    if (produced.parent.value.type === 'ExpressionStatement') return;

    if (!coercion) {
      warn(parent);
      return;
    }

    j(produced).replaceWith(coercion.build(j, produced.value));
  });
};

export default rewriteYields;
