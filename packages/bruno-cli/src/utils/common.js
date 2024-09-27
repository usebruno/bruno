const fs = require('fs');
const FormData = require('form-data');
const { forOwn } = require('lodash');
const path = require('path');

const lpad = (str, width) => {
  let paddedStr = str;
  while (paddedStr.length < width) {
    paddedStr = ' ' + paddedStr;
  }
  return paddedStr;
};

const rpad = (str, width) => {
  let paddedStr = str;
  while (paddedStr.length < width) {
    paddedStr = paddedStr + ' ';
  }
  return paddedStr;
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
  lpad,
  rpad,
  createFormData
};
