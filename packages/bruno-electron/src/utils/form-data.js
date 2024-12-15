const { forEach } = require('lodash');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

/**
 * @param {Array.<object>} params The request body Array
 * @returns {object} Returns an obj with repeating key as a array of values
 * {item: 2, item: 3, item1: 4} becomes {item: [2,3], item1: 4}
 */
const buildFormUrlEncodedPayload = (params) => {
  return params.reduce((acc, p) => {
    if (!acc[p.name]) {
      acc[p.name] = p.value;
    } else if (Array.isArray(acc[p.name])) {
      acc[p.name].push(p.value);
    } else {
      acc[p.name] = [acc[p.name], p.value];
    }
    return acc;
  }, {});
};


const createFormData = (data, collectionPath) => {
  // make axios work in node using form data
  // reference: https://github.com/axios/axios/issues/1006#issuecomment-320165427
  const form = new FormData();
  forEach(data, (datum) => {
    const { name, type, value, contentType } = datum;
    let options = {};
    if (contentType) {
      options.contentType = contentType;
    }
    if (type === 'text') {
      if (Array.isArray(value)) {
        value.forEach((val) => form.append(name, val, options));
      } else {
        form.append(name, value, options);
      }
      return;
    }

    if (type === 'file') {
      const filePaths = value || [];
      filePaths.forEach((filePath) => {
        let trimmedFilePath = filePath.trim();
        if (!path.isAbsolute(trimmedFilePath)) {
          trimmedFilePath = path.join(collectionPath, trimmedFilePath);
        }
        options.filename = path.basename(trimmedFilePath);
        form.append(name, fs.createReadStream(trimmedFilePath), options);
      });
    }
  });
  return form;
};

module.exports = {
  buildFormUrlEncodedPayload,
  createFormData
};
