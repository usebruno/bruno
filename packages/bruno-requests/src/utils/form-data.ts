import { forEach } from 'lodash';
import FormData from 'form-data';
import fs from 'node:fs';
import path from 'node:path';

export interface FormDataField {
  name: string;
  type: 'text' | 'file';
  value: string | string[];
  contentType?: string;
}

export const formatMultipartData = (multipartData: FormDataField[], boundary?: string): string => {
  if (!Array.isArray(multipartData) || multipartData.length === 0) {
    return '';
  }

  const normalizeBoundary = (b?: string): string => {
    const value = b || 'boundary';
    return value.replace(/^--+/, '').replace(/--+$/, '');
  };

  const getFileName = (filePath: string): string => {
    if (typeof filePath === 'string' && filePath.trim()) {
      return path.basename(filePath) || 'file';
    }
    return 'file';
  };

  const formatValue = (value: string | string[]): string => {
    if (Array.isArray(value)) {
      return value.map((v) => String(v ?? '')).join(', ');
    }
    return String(value ?? '');
  };

  const boundaryValue = normalizeBoundary(boundary);
  const parts: string[] = [];

  multipartData.forEach((field) => {
    if (!field || !field.name) return;

    parts.push(`----${boundaryValue}`);
    parts.push('Content-Disposition: form-data');

    if (field.type === 'file') {
      const filePaths = Array.isArray(field.value) ? field.value : (field.value ? [field.value] : ['']);
      filePaths.forEach((filePath) => {
        parts.push(`----${boundaryValue}`);
        parts.push('Content-Disposition: form-data');
        const fileName = getFileName(filePath);
        parts.push(`name: ${field.name}`);
        parts.push(`value: [File: ${fileName}]`);
        parts.push('');
      });
    } else {
      const value = formatValue(field.value);
      parts.push(`name: ${field.name}`);
      parts.push(`value: ${value}`);
      parts.push('');
    }
  });

  parts.push(`----${boundaryValue}--`);
  return parts.join('\n');
};

export const createFormData = (data: FormDataField[], collectionPath: string): FormData => {
  const form = new FormData();

  forEach(data, (datum) => {
    const { name, type, value, contentType } = datum;
    const options: { contentType?: string; filename?: string } = {};

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
      const filePaths = Array.isArray(value) ? value : (value ? [value] : []);
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
