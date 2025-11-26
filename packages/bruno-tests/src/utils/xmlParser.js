const { XMLParser } = require('fast-xml-parser');

const xmlParser = () => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    allowBooleanAttributes: true,
  });

  return (req, res, next) => {
    if (req.is('application/xml') || req.is('text/xml')) {
      let data = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          req.body = parser.parse(data);
          next();
        } catch (err) {
          res.status(400).send('Invalid XML');
        }
      });
    } else {
      next();
    }
  };
};

module.exports = xmlParser;