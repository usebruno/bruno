import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import CodeSnippet from './index';

const theme = {
  font: { size: { xs: '0.75rem' } },
  background: { elevated: '#f5f5f5' },
  border: { border2: '#e0e0e0', radius: { base: '4px' } },
  colors: { text: { danger: '#ef4444', warning: '#f59e0b', muted: '#999' } }
};

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const sampleLines = [
  { lineNumber: 3, content: 'const a = 1;', isHighlighted: false },
  { lineNumber: 4, content: 'undefinedVar.foo();', isHighlighted: true },
  { lineNumber: 5, content: 'const b = 2;', isHighlighted: false }
];

describe('CodeSnippet', () => {
  it('should render nothing when lines is empty', () => {
    const { container } = renderWithTheme(<CodeSnippet lines={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when lines is null', () => {
    const { container } = renderWithTheme(<CodeSnippet lines={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render all lines with line numbers', () => {
    renderWithTheme(<CodeSnippet lines={sampleLines} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should apply error highlight class by default', () => {
    const { container } = renderWithTheme(<CodeSnippet lines={sampleLines} variant="error" />);
    const highlightedLine = container.querySelector('.highlighted-error');
    expect(highlightedLine).toBeInTheDocument();
  });

  it('should apply warning highlight class when variant is warning', () => {
    const { container } = renderWithTheme(<CodeSnippet lines={sampleLines} variant="warning" />);
    const highlightedLine = container.querySelector('.highlighted-warning');
    expect(highlightedLine).toBeInTheDocument();
    expect(container.querySelector('.highlighted-error')).not.toBeInTheDocument();
  });

  it('should show > prefix on highlighted line for accessibility', () => {
    const { container } = renderWithTheme(<CodeSnippet lines={sampleLines} />);
    const codeLineContents = container.querySelectorAll('.code-line-content');
    // The highlighted line (index 1) should start with "> "
    expect(codeLineContents[1].textContent).toContain('> ');
    // Non-highlighted lines should not have ">"
    expect(codeLineContents[0].textContent).not.toContain('>');
  });

  it('should also support isError property for backward compatibility', () => {
    const linesWithIsError = [
      { lineNumber: 1, content: 'line 1', isError: false },
      { lineNumber: 2, content: 'error line', isError: true },
      { lineNumber: 3, content: 'line 3', isError: false }
    ];
    const { container } = renderWithTheme(<CodeSnippet lines={linesWithIsError} />);
    expect(container.querySelector('.highlighted-error')).toBeInTheDocument();
  });

  describe('hunks prop', () => {
    const sampleHunks = [
      {
        hasSeparatorBefore: false,
        lines: [
          { lineNumber: 1, content: 'const a = 1;', isHighlighted: false },
          { lineNumber: 2, content: 'pm.vault.get();', isHighlighted: true },
          { lineNumber: 3, content: 'const b = 2;', isHighlighted: false }
        ]
      },
      {
        hasSeparatorBefore: true,
        lines: [
          { lineNumber: 10, content: 'const x = 10;', isHighlighted: false },
          { lineNumber: 11, content: 'pm.cookies.jar();', isHighlighted: true },
          { lineNumber: 12, content: 'const y = 11;', isHighlighted: false }
        ]
      }
    ];

    it('should render all lines from all hunks', () => {
      renderWithTheme(<CodeSnippet hunks={sampleHunks} variant="warning" />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('11')).toBeInTheDocument();
    });

    it('should render separator between hunks when hasSeparatorBefore is true', () => {
      const { container } = renderWithTheme(<CodeSnippet hunks={sampleHunks} variant="warning" />);
      const separators = container.querySelectorAll('.code-line-separator');
      expect(separators).toHaveLength(1);
    });

    it('should render the ellipsis character in separator', () => {
      const { container } = renderWithTheme(<CodeSnippet hunks={sampleHunks} variant="warning" />);
      const separator = container.querySelector('.separator-content');
      expect(separator.textContent).toBe('\u22EE');
    });

    it('should apply warning highlights within hunks', () => {
      const { container } = renderWithTheme(<CodeSnippet hunks={sampleHunks} variant="warning" />);
      const highlighted = container.querySelectorAll('.highlighted-warning');
      expect(highlighted).toHaveLength(2);
    });

    it('should render nothing when hunks is empty array', () => {
      const { container } = renderWithTheme(<CodeSnippet hunks={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });
});
