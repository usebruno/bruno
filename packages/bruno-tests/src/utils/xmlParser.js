const { XMLParser } = require('fast-xml-parser');

const xmlParser = () => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    allowBooleanAttributes: true,
    attributeNamePrefix: '',
    isArray: (name, jpath, isLeafNode) => isLeafNode,
  });

  return (req, res, next) => {
    if (req.is('application/xml') || req.is('text/xml')) {
      try {
        req.body = parser.parse(req.rawBody);
        next();
      } catch (err) {
        res.status(400).send('Invalid XML');
      }
    } else {
      next();
    }
  };
};

module.exports = xmlParser;