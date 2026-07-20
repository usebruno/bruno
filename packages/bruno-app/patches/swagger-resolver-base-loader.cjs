const FALLBACK_BASE = 'http://localhost/';


const RETRIEVAL_URI_RETURN = /return ([^;]*globalThis\.document\.baseURI[^;]*);/;

const wrapReturn = (originalExpression) =>
  `const resolvedBase = ${originalExpression};\n` +
  `  return resolvedBase.startsWith('http://') || resolvedBase.startsWith('https://')\n` +
  `    ? resolvedBase\n` +
  `    : '${FALLBACK_BASE}';`;

module.exports = function swaggerResolverBaseFix(source) {
  if (!RETRIEVAL_URI_RETURN.test(source)) {
    throw new Error(
      `[swagger-resolver-base-loader] retrievalURI() return not found in ${this.resourcePath}. ` +
        'swagger-client has likely changed — re-verify the file:// $ref resolver fix (BRU-3939) and update this loader.'
    );
  }

  return source.replace(RETRIEVAL_URI_RETURN, (_match, originalExpression) => wrapReturn(originalExpression));
};
