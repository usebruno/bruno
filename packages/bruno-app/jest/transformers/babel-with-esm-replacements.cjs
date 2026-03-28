const babelJest = require('babel-jest')

module.exports = {
  process(sourceText, sourcePath, options) {
    const transformer = babelJest.createTransformer();
    return transformer.process(sourceText.replace(`import.meta.env.MODE`, 'test'), sourcePath, options)
  }
};