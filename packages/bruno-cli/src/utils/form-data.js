const { forEach } = require('lodash');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { isLargeFile } = require('./filesystem');

const STREAMING_FILE_SIZE_THRESHOLD = 20 * 1024 * 1024; // 20MB

const createFormData = (data, collectionPath, streamThreshold = STREAMING_FILE_SIZE_THRESHOLD) => {
  // make axios work in node using form data
  // reference: https://github.com/axios/axios/issues/1006#issuecomment-320165427
  const form = new FormData();
  forEach(data, (datum) => {
    const { name, type, value, contentType } = datum;
    let options = {};
    if (contentType) {
      options.contentType = contentType;
    }
    if (type === 'file') {
      const filePaths = Array.isArray(value) ? value : (value ? [value] : []);
      filePaths.forEach((filePath) => {
        if (!filePath) return;
        let trimmedFilePath = filePath.trim();
        if (!path.isAbsolute(trimmedFilePath)) {
          trimmedFilePath = path.join(collectionPath, trimmedFilePath);
        }
        options.filename = path.basename(trimmedFilePath);
        try {
          form.append(
            name,
            isLargeFile(trimmedFilePath, streamThreshold)
              ? fs.createReadStream(trimmedFilePath)
              : fs.readFileSync(trimmedFilePath),
            options
          );
        } catch (error) {
          console.error('Error reading file:', error);
        }
      });
    } else {
      if (Array.isArray(value)) {
        value.forEach((val) => form.append(name, val ?? '', options));
      } else {
        form.append(name, value ?? '', options);
      }
    }
  });
  return form;
};

module.exports = {
  createFormData
};
