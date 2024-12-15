const { forOwn } = require('lodash');
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


const createFormData = (datas, collectionPath) => {
  // make axios work in node using form data
  // reference: https://github.com/axios/axios/issues/1006#issuecomment-320165427
  const form = new FormData();
  forOwn(datas, (value, key) => {
    if (typeof value == 'string') {
      form.append(key, value);
      return;
    }

    const filePaths = value || [];
    filePaths?.forEach?.((filePath) => {
      let trimmedFilePath = filePath.trim();

      if (!path.isAbsolute(trimmedFilePath)) {
        trimmedFilePath = path.join(collectionPath, trimmedFilePath);
      }

      form.append(key, fs.createReadStream(trimmedFilePath), path.basename(trimmedFilePath));
    });
  });
  return form;
};

module.exports = {
  buildFormUrlEncodedPayload,
  createFormData
};
