import { HTTP_URL } from 'utils/importers/import-sources';

export const isZipUrl = (text) => HTTP_URL.test(text) && /\.zip(\?.*)?$/i.test(text);
