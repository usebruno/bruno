const { forEach } = require('lodash');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

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
  createFormData
}