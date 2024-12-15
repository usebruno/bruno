const { forEach } = require('lodash');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const createFormData = (data, collectionPath) => {
  // make axios work in node using form data
  // reference: https://github.com/axios/axios/issues/1006#issuecomment-320165427
  const form = new FormData();
  forEach(data, (datum) => {
    const { name, type, value } = datum;

    if (type === 'text') {
      if (Array.isArray(value)) {
        value.forEach((val) => form.append(name, val));
      } else {
        form.append(name, value);
      }
      return;
    }

    if (type === 'file') {
      const filePaths = value || [];
      filePaths.forEach((filePath) => {
        let trimmedFilePath = filePath.trim();
        console.log(trimmedFilePath, collectionPath);
        if (!path.isAbsolute(trimmedFilePath)) {
          trimmedFilePath = path.join(collectionPath, trimmedFilePath);
        }

        form.append(name, fs.createReadStream(trimmedFilePath), path.basename(trimmedFilePath));
      });
    }
  });
  return form;
};

module.exports = {
  createFormData
}