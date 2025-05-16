// Mock the uuid function
jest.mock('./src/common', () => {
  // Import the original module to keep other functions intact
  const originalModule = jest.requireActual('./src/common');

  return {
    __esModule: true, // Use this property to indicate it's an ES module
    ...originalModule,
    uuid: jest.fn(() => 'mockeduuidvalue123456'), // Mock uuid to return a fixed value
  };
});