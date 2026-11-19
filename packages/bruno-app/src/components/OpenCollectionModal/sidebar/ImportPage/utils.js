import { HTTP_URL } from 'providers/ReduxStore/slices/open-collection-modal/import-sources';

export const describeImportText = (text) => {
  if (!HTTP_URL.test(text)) {
    return { text: 'Raw text · Bruno detects the format' };
  }
  if (/\.zip(\?.*)?$/i.test(text)) {
    return { isWarning: true, text: 'Bruno collection (.zip) from a URL · not supported yet. Download it and drop it here.' };
  }
  if (/\.ya?ml(\?.*)?$/i.test(text)) {
    return { text: 'YAML from a URL · a Bruno collection is unpacked, an OpenAPI spec is converted' };
  }
  if (/\.json(\?.*)?$/i.test(text)) {
    return { text: 'JSON from a URL · Bruno detects Postman, Insomnia or OpenAPI' };
  }
  return { text: 'URL · Bruno fetches it and detects the format' };
};
