const jsyaml = require('js-yaml');


const yamlToJson = (yamlString) => {
  try {
    return jsyaml.load(yamlString);
  } catch (err) {
    throw new Error(`Failed to parse YAML: ${err.message}`);
  }
};

export default yamlToJson; 