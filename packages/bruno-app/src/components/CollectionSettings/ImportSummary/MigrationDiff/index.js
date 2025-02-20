import React, { useState, useEffect } from 'react';
import { html, parse } from 'diff2html';
import { useTheme } from 'providers/Theme';
import 'diff2html/bundles/css/diff2html.min.css';
// import 'diff2html/bundles/css/diff2html-summary.min.css';

const MigrationDiff = ({ untranslated, translated, scriptType = 'pre-request', sourceType = 'request' }) => {
  const [diffHtml, setDiffHtml] = useState('');
  const { displayedTheme } = useTheme();

  console.log('untranslated--from--diff', untranslated);
  console.log('translated--from--diff', translated);

  useEffect(() => {
    let untranslatedCode = '';
    let translatedCode = '';

    // Get the appropriate code based on script type and source
    const basePath = sourceType === 'folder' ? 'root.request' : 'request';
    
    switch (scriptType) {
      case 'pre-request':
        untranslatedCode = untranslated?.[basePath]?.script?.req || '';
        translatedCode = translated?.[basePath]?.script?.req || '';
        break;
      case 'post-response':
        untranslatedCode = untranslated?.[basePath]?.script?.res || '';
        translatedCode = translated?.[basePath]?.script?.res || '';
        break;
      case 'test':
        untranslatedCode = untranslated?.[basePath]?.tests || '';
        translatedCode = translated?.[basePath]?.tests || '';
        break;
      default:
        untranslatedCode = '';
        translatedCode = '';
    }

    // Only proceed if we have valid content to compare
    if (!untranslatedCode && !translatedCode) {
      setDiffHtml('<div class="no-diff">No script content found</div>');
      return;
    }

    const generateDiffText = (oldCode, newCode) => {
      const oldLines = oldCode.split('\n');
      const newLines = newCode.split('\n');

      // Filter out comment-only additions from new code
      const filteredNewLines = newLines.filter(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return false;
        const isJustComment = trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*');
        return !isJustComment;
      });

      return [
        'diff --git a/untranslated b/translated',
        'index 000000..000000 100644',
        '--- a/untranslated',
        '+++ b/translated',
        '@@ -1,' + oldLines.length + ' +1,' + filteredNewLines.length + ' @@',
        ...oldLines.map(line => '-' + line),
        ...filteredNewLines.map(line => '+' + line)
      ].join('\n');
    };

    const diffText = generateDiffText(untranslatedCode, translatedCode);
    const diffJson = parse(diffText);
    const isDarkTheme = displayedTheme === 'dark';

    const htmlDiff = html(diffJson, {
      drawFileList: false,
      matching: 'lines',
      outputFormat: 'line-by-line',
      matchWordsThreshold: 0.25,
      matchingMaxComparisons: 2500,
      maxLineSizeInBlockForComparison: 200,
      maxLineLengthHighlight: 10000,
      diffStyle: 'char',
      renderNothingWhenEmpty: true,
      colorScheme: isDarkTheme ? 'dark' : 'light',
      highlight: true,
      fileContentToggle: false,
      stickyFileHeaders: false,
      lineNumbers: false
    });

    setDiffHtml(htmlDiff);
  }, [untranslated, translated, scriptType, sourceType, displayedTheme]);

  const containerStyle = {
    backgroundColor: displayedTheme === 'dark' ? '#1e1e1e' : '#f5f5f5',
    color: displayedTheme === 'dark' ? '#ccc' : '#333',
    borderColor: displayedTheme === 'dark' ? '#373737' : '#ddd'
  };

  const diffContentStyle = {
    fontSize: '12px',
    lineHeight: '1.5',
    fontFamily: 'Monaco, Consolas, monospace'
  };

  return (
    <div className="diff-viewer-container" style={containerStyle}>
      {/* <h2>Code Diff Viewer</h2> */}
      <div className="diff-viewer">
        <div className="diff-header">
          {/* <div className="diff-column">Untranslated</div>
          <div className="diff-column">Translated</div> */}
        </div>
        <div className="diff-content" 
          style={diffContentStyle}
          dangerouslySetInnerHTML={{ __html: diffHtml }} 
        />
      </div>
    </div>
  );
};

export default MigrationDiff;
