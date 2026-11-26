import { HTTP_URL } from 'utils/importers/import-sources';

export const isZipUrl = (text) => HTTP_URL.test(text) && /\.zip(\?.*)?$/i.test(text);

export const tidyPastedText = (text) => {
  const tidied = text.replace(/\r\n?/g, '\n').replace(/^\s*\n/, '').trimEnd();
  return tidied.includes('\n') ? tidied : tidied.trimStart();
};
