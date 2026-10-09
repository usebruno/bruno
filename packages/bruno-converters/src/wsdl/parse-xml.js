import xml2js from 'xml2js';

// xml2js groups children by tag name and loses their order
// so each element node is stamped with its document position.
export const XML_POSITION_KEY = '#position';

const parseXML = (xmlString) => {
  let position = 0;
  const parser = new xml2js.Parser({
    explicitArray: false,
    ignoreAttrs: false,
    mergeAttrs: true,
    xmlns: false,
    // An empty tag parses as an object to carry position
    emptyTag: () => ({}),
    validator: (xpath, current, node) => {
      if (node && typeof node === 'object') {
        node[XML_POSITION_KEY] = position++;
      }
      return node;
    }
  });

  return new Promise((resolve, reject) => {
    parser.parseString(xmlString, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

export default parseXML;
