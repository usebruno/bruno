/**
 * Expressions that recover the shape a source script expects from the value its target
 * equivalent actually yields.
 *
 * A coercion is applied once, where the value is produced, rather than at each place the
 * value is read. One edit then makes every later use correct, and no reference has to be
 * found, scope-checked, or rewritten:
 *
 *   const v = await jar.get(url, name);     ->  const v = (await jar.getCookie(url, name)).value;
 *   console.log(v.toUpperCase());               console.log(v.toUpperCase());   // untouched
 *
 * `describes` is for the shapes this cannot reach. A value handed to a callback arrives as
 * a parameter rather than as the call's result, and there is nowhere to put an expression
 * without renaming the parameter and declaring another — so the statement is flagged with
 * `describes` instead. Normalising callbacks to `await` before this pass would remove the
 * second case; until then both are spelled out.
 *
 * The correspondence table names a coercion; the builder lives here, so the table stays
 * data that can be read and checked without running anything.
 */
const COERCIONS = {
  cookieToValue: {
    build: (j, expression) => j.memberExpression(expression, j.identifier('value')),
    describes: 'Bruno yields the cookie object where Postman yields the value string'
  }
};

export default COERCIONS;
