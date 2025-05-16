import '@testing-library/jest-dom';
import { ThemeProvider } from 'styled-components';

// Mock InputEvent if it's not available in the test environment
if (typeof InputEvent === 'undefined') {
  global.InputEvent = class InputEvent extends Event {
    constructor(type, options) {
      super(type, options);
      this.inputType = options?.inputType || '';
      this.data = options?.data || null;
    }
  };
}

// Mock the theme
const mockTheme = {
  codemirror: {
    bg: '#ffffff',
    color: '#24292e',
    border: '#e1e4e8',
    selection: '#b4d5fe',
    selectionMatch: '#b4d5fe',
    lineNumber: '#1b1f234d',
    searchMatch: '#fff951',
    searchMatchBorder: '#c4c4c4',
    matchingBracket: '#34d058',
    guttersBg: '#fff',
    guttermarkerText: '#24292e',
    guttermarkerSubtleText: '#6a737d',
    linenumberText: '#1b1f234d',
    cursor: '#24292e',
    secondaryCursor: '#24292e',
    measure: '#24292e',
    lineHighlight: '#f6f8fa'
  }
};

// Mock styled-components
jest.mock('styled-components', () => ({
  ThemeProvider: ({ children }) => children,
  createGlobalStyle: () => null,
  css: (...args) => JSON.stringify(args),
  keyframes: () => '',
  default: (Component) => Component,
}));