import { BrunoError } from 'utils/common/error';
import { wsdlToBruno } from '@usebruno/converters';

const isWSDLCollection = (data) => {
  // Check if data is a string (WSDL content)
  if (typeof data !== 'string') {
    return false;
  }

  // Check for WSDL-specific XML elements
  const wsdlIndicators = [
    'wsdl:definitions',
    'definitions',
    'wsdl:types',
    'wsdl:message',
    'wsdl:portType',
    'wsdl:binding',
    'wsdl:service'
  ];

  // Check if the content contains WSDL namespace or elements
  const hasWSDLNamespace = data.includes('xmlns:wsdl=')
    || data.includes('xmlns="http://schemas.xmlsoap.org/wsdl/"')
    || data.includes('xmlns="http://www.w3.org/2001/XMLSchema"');

  const hasWSDLElements = wsdlIndicators.some((indicator) => data.includes(indicator));

  return hasWSDLNamespace || hasWSDLElements;
};

const getWsdlImportOptions = (filePath) => {
  if (!filePath) {
    return {};
  }
  return {
    uri: filePath,
    resolve: (baseUri, ref) => window.ipcRenderer.invoke('renderer:resolve-wsdl-schema-ref', baseUri, ref)
  };
};

export const convertWsdlToBruno = async (data, filePath) => {
  try {
    return await wsdlToBruno(data, getWsdlImportOptions(filePath));
  } catch (err) {
    console.error('Error converting WSDL to Bruno:', err);
    throw new BrunoError(err.message);
  }
};

export { isWSDLCollection };
