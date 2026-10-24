// The Postman translators reprint code via recast, whose toSource() takes its
// line terminator from os.EOL, so translated output is CRLF on Windows while the
// spec expectations (and collection files, per .gitattributes) are LF. Pin os.EOL
// to LF for the test process so output is identical on every platform. recast
// reads os.EOL once at load, and setupFiles run before any spec requires a
// translator, so this lands first.
Object.defineProperty(require('os'), 'EOL', { value: '\n', configurable: true, writable: true });

// Mock the uuid function
jest.mock('./src/common', () => {
  // Import the original module to keep other functions intact
  const originalModule = jest.requireActual('./src/common');

  return {
    __esModule: true, // Use this property to indicate it's an ES module
    ...originalModule,
    uuid: jest.fn(() => 'mockeduuidvalue123456') // Mock uuid to return a fixed value
  };
});
