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

export { isWSDLCollection };
