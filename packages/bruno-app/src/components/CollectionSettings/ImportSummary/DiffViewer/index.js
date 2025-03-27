import React, { useState, useEffect } from 'react';
import { html, parse } from 'diff2html';
import { useTheme } from 'providers/Theme';
import 'diff2html/bundles/css/diff2html.min.css';
// import 'diff2html/bundles/css/diff2html-summary.min.css';

const DiffViewer = ({ untranslated, translated, scriptType = 'pre-request', sourceType = 'request' }) => {
  const [diffHtml, setDiffHtml] = useState('');
  const { displayedTheme } = useTheme();

  console.log('untranslated--from--diff', untranslated);
  console.log('translated--from--diff', translated);

  useEffect(() => {
    let untranslatedCode = '';
    let translatedCode = '';

    console.log('DiffViewer Props:', {
      sourceType,
      scriptType,
      untranslated,
      translated
    });

    // Get the appropriate code based on script type and source
    if (sourceType === 'collection') {
      switch (scriptType) {
        case 'pre-request':
          untranslatedCode = untranslated?.root?.request?.script?.req || '';
          translatedCode = translated?.root?.request?.script?.req || '';
          break;
        case 'post-response':
          untranslatedCode = untranslated?.root?.request?.script?.res || '';
          translatedCode = translated?.root?.request?.script?.res || '';
          break;
        case 'test':
          untranslatedCode = untranslated?.root?.request?.tests || '';
          translatedCode = translated?.root?.request?.tests || '';
          break;
        default:
          untranslatedCode = '';
          translatedCode = '';
      }
    } else if (sourceType === 'folder') {
      switch (scriptType) {
        case 'pre-request':
          untranslatedCode = untranslated?.root?.request?.script?.req || '';
          translatedCode = translated?.root?.request?.script?.req || '';
          break;
        case 'post-response':
          untranslatedCode = untranslated?.root?.request?.script?.res || '';
          translatedCode = translated?.root?.request?.script?.res || '';
          break;
        case 'test':
          untranslatedCode = untranslated?.root?.request?.tests || '';
          translatedCode = translated?.root?.request?.tests || '';
          break;
        default:
          untranslatedCode = '';
          translatedCode = '';
      }
    } else {
      switch (scriptType) {
        case 'pre-request':
          untranslatedCode = untranslated?.request?.script?.req || '';
          translatedCode = translated?.request?.script?.req || '';
          break;
        case 'post-response':
          untranslatedCode = untranslated?.request?.script?.res || '';
          translatedCode = translated?.request?.script?.res || '';
          break;
        case 'test':
          untranslatedCode = untranslated?.request?.tests || '';
          translatedCode = translated?.request?.tests || '';
          break;
        default:
          untranslatedCode = '';
          translatedCode = '';
      }
    }

    console.log('Extracted Code:', {
      untranslatedCode,
      translatedCode,
      sourceType
    });

    // Only proceed if we have valid content to compare
    if (!untranslatedCode && !translatedCode) {
      setDiffHtml('<div class="no-diff">No script content found</div>');
      return;
    }

    const generateDiff = (oldCode, newCode) => {
      const oldLines = oldCode.split('\n');
      const newLines = newCode.split('\n');
      const maxLines = Math.max(oldLines.length, newLines.length);
      let diffText = [
        'diff --git a/Untranslated b/Translated',
        'index 8d61203e12..1bc809e798 100644',
        '--- a/Scripts',
        '+++ b/Scripts',
        '@@ -1,' + oldLines.length + ' +1,' + newLines.length + ' @@'
      ];

      for (let i = 0; i < maxLines; i++) {
        const oldLine = oldLines[i].slice(3) || '';
        const newLine = newLines[i] || '';
        
        // Always add both lines, with a space prefix for unchanged lines
        if (oldLine === newLine) {
          diffText.push(' ' + oldLine);
          diffText.push(' ' + newLine);
        } else {
          if (oldLine) diffText.push('- ' + oldLine);
          if (newLine) diffText.push('+ ' + newLine);
        }
      }

      return diffText.join('\n');
    };

    const diffText = generateDiff(untranslatedCode, translatedCode);
    const diffData = parse(diffText);

    const isDarkTheme = displayedTheme === 'dark';

    const htmlDiff = html(diffData, {
      matching: 'lines',
      matchWordsThreshold: 0.25,
      maxLineLengthHighlight: 10000,
      diffStyle: 'word',
      colorScheme: isDarkTheme ? 'dark' : 'light',
      renderNothingWhenEmpty: false,
      matchingMaxComparisons: 2500,
      maxLineSizeInBlockForComparison: 200,
      outputFormat: 'side-by-side',
      drawFileList: false,
      synchronisedScroll: true,
      highlight: true,
      fileListToggle: false,
      fileListStartVisible: false,
      smartSelection: true,
      fileContentToggle: false,
      stickyFileHeaders: false
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

export default DiffViewer;
