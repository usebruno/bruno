// Mock Redux hooks
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

// Mock Theme provider
jest.mock('providers/Theme', () => ({
  useTheme: () => ({
    storedTheme: 'light',
    displayedTheme: 'light'
  })
}));

// Mock collection utilities
jest.mock('utils/collections', () => ({
  getAllVariables: jest.fn().mockReturnValue({})
}));

// Mock common utilities
jest.mock('utils/common', () => ({
  isEqual: jest.fn()
}));