const { forEach } = require('lodash');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { isLargeFile } = require('./filesystem');

const STREAMING_FILE_SIZE_THRESHOLD = 20 * 1024 * 1024; // 20MB

const formatMultipartData = (multipartData, boundary) => {
  if (!Array.isArray(multipartData) || multipartData.length === 0) {
    return '';
  }

  const normalizeBoundary = (b) => {
    const value = b || 'boundary';
    return value.replace(/^--+/, '').replace(/--+$/, '');
  };

  const getFileName = (filePath) => {
    if (typeof filePath === 'string' && filePath.trim()) {
      return path.basename(filePath) || 'file';
    }
    return 'file';
  };

  const boundaryValue = normalizeBoundary(boundary);
  const parts = [];

  multipartData.forEach((field) => {
    if (!field || !field.name) return;

    if (field.type === 'file') {
      const filePaths = Array.isArray(field.value) ? field.value : (field.value ? [field.value] : ['']);
      filePaths.forEach((filePath) => {
        const fileName = getFileName(filePath);
        parts.push(`----${boundaryValue}`);
        parts.push(`Content-Disposition: form-data; name: ${field.name}; filename: ${fileName}`);
        if (field.contentType) parts.push(`Content-Type: ${field.contentType}`);
        parts.push(`value: [File: ${fileName}]`);
        parts.push('');
      });
    } else {
      const values = Array.isArray(field.value) ? field.value : [field.value ?? ''];
      values.forEach((val) => {
        parts.push(`----${boundaryValue}`);
        parts.push(`Content-Disposition: form-data; name: ${field.name}`);
        if (field.contentType) parts.push(`Content-Type: ${field.contentType}`);
        parts.push(`value: ${String(val ?? '')}`);
        parts.push('');
      });
    }
  });

  parts.push(`----${boundaryValue}--`);
  return parts.join('\n');
};

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
  createFormData,
  formatMultipartData
};
