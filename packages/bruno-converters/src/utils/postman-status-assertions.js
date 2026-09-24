const j = require('jscodeshift');

/**
 * Generates data-driven status assertion entries for pm.response.to.be.*
 * Each assertion gets positive, to.not.be, and to.be.not variants.
 */
export const buildStatusAssertionEntries = () => {
  const buildStatusTransform = (chain, litArgs) => (path) => {
    return j.callExpression(
      j.memberExpression(
        j.callExpression(j.identifier('expect'), [j.callExpression(j.identifier('res.getStatus'), [])]),
        j.identifier(chain)
      ),
      litArgs.map((v) => j.literal(v))
    );
  };

  // Only replaces the first 'to.' — safe because all chains start with 'to.' and contain no other 'to.'
  const negateChain = (chain) => chain.replace('to.', 'to.not.');

  const statusAssertions = [
    // Range-based assertions
    { name: 'ok', chain: 'to.be.within', args: [200, 299] },
    { name: 'success', chain: 'to.be.within', args: [200, 299] },
    { name: 'info', chain: 'to.be.within', args: [100, 199] },
    { name: 'redirection', chain: 'to.be.within', args: [300, 399] },
    { name: 'clientError', chain: 'to.be.within', args: [400, 499] },
    { name: 'serverError', chain: 'to.be.within', args: [500, 599] },
    { name: 'error', chain: 'to.be.at.least', args: [400] },
    // Specific status code assertions
    { name: 'accepted', chain: 'to.equal', args: [202] },
    { name: 'badRequest', chain: 'to.equal', args: [400] },
    { name: 'unauthorized', chain: 'to.equal', args: [401] },
    { name: 'forbidden', chain: 'to.equal', args: [403] },
    { name: 'notFound', chain: 'to.equal', args: [404] },
    { name: 'rateLimited', chain: 'to.equal', args: [429] }
  ];

  const entries = [];

  // Generate positive + negated entries for each status assertion
  statusAssertions.forEach(({ name, chain, args }) => {
    entries.push(
      { pattern: `pm.response.to.be.${name}`, transform: buildStatusTransform(chain, args) },
      { pattern: `pm.response.to.not.be.${name}`, transform: buildStatusTransform(negateChain(chain), args) },
      { pattern: `pm.response.to.be.not.${name}`, transform: buildStatusTransform(negateChain(chain), args) }
    );
  });

  return entries;
};
