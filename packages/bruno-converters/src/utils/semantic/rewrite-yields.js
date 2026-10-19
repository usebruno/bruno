import { isFunctionExpression, isMethodCall, reportUntranslated } from '../ast-utils';
import { collectMemberTargets } from './type-environment';
import { getPromiseChainLinks } from './promise-chain';

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
 * A yielded value is only worth adapting where it is read, which is what separates the cases:
 *   - a method whose result is used — projected, or reported when nothing bridges it
 *   - a method handed a callback — reported, since the value arrives as a parameter and an
 *     expression has nowhere to go
 *   - a plain property — reported, since there is no call to hang a coercion off
 *   - a method whose result is discarded — left alone; nothing observes the difference
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} root - jscodeshift Collection to search within
 * @param {Array} bindings - Typed bindings in scope
 * @param {Object} registry - The API registry
 */
const rewriteYields = (j, root, bindings, registry) => {
  const targets = collectMemberTargets(j, root, bindings, registry)
    // a yielded *type* is handled by binding collection, not by adapting the value here
    .filter(({ spec }) => spec.yields && (spec.yields.project || spec.yields.differs));

  targets.forEach(({ path: memberPath, propertyName, spec: { yields } }) => {
    // a projection that cannot be placed still has to say what the source expected
    const reason = yields.differs
      || `only '${yields.project}' of this value was expected, and there is nowhere to take it`;
    const report = (node) => reportUntranslated(node, propertyName, reason);

    const parent = memberPath.parent;

    // a property carries its value directly, leaving nowhere to hang a coercion
    if (!isMethodCall(memberPath)) {
      report(memberPath.value);
      return;
    }

    if (parent.value.arguments.some(isFunctionExpression)) {
      report(parent.value);
      return;
    }

    // the value to adapt is what the `await` produces, not the promise it produces it from
    const isAwaited = parent.parent.value.type === 'AwaitExpression';
    const produced = isAwaited ? parent.parent : parent;
    if (produced.parent.value.type === 'ExpressionStatement') return;

    /**
     * An un-awaited call entering a promise chain carries its value to a handler parameter, so
     * there is no expression here to adapt — appending one would land it on the promise:
     * `jar.get(u, n).value.then(...)` reads `.value` off a Promise and is undefined.
     */
    if (!isAwaited && getPromiseChainLinks(produced).length) {
      report(parent.value);
      return;
    }

    if (!yields.project) {
      report(parent.value);
      return;
    }

    j(produced).replaceWith(j.memberExpression(produced.value, j.identifier(yields.project)));
  });
};

export default rewriteYields;
