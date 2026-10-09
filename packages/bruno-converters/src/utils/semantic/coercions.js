/**
 * Expressions that recover the shape a source script expects from the value its target
 * equivalent actually yields.
 *
 * A coercion is applied once, where the value is produced, rather than at each place the
 * value is read.
 *
 *   const v = await jar.get(url, name);     ->  const v = (await jar.getCookie(url, name)).value;
 *   console.log(v.toUpperCase());               console.log(v.toUpperCase());   // untouched
 *
 */
const COERCIONS = {
  cookieToValue: {
    build: (j, expression) => j.memberExpression(expression, j.identifier('value')),
    describes: 'Bruno yields the cookie object where Postman yields the value string'
  }
};

export default COERCIONS;
