const { forEach } = require('lodash');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

/**
 * @param {Array.<object>} params The request body Array
 * @returns {string} Returns a order respecting standard compliant string of form encoded values
 */
const buildFormUrlEncodedPayload = (params) => {
  if (typeof params !== 'object') return '';
  if (!Array.isArray(params)) return '';
  const resultParams = new URLSearchParams();
  for (const param of params) {
    // Invalid items are ignored
    if (typeof param != 'object') continue;
    if (!('name' in param)) continue;
    resultParams.append(param.name, param.value ?? '');
  }
  return resultParams.toString();
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
}