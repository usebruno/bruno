import mime from 'mime-types';
import path from 'utils/common/path';

export const getMultipartAutoContentType = (files) => {
  if (!Array.isArray(files) || files.length === 0) return '';
  if (files.length === 1) {
    return mime.contentType(path.extname(files[0])) || '';
  }
  return 'multipart/mixed';
};
