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

    const generateDiff = (oldCode, newCode) => {
      const oldLines = oldCode.split('\n');
      const newLines = newCode.split('\n');
      let diffOutput = '';

      // Process each line pair
      const maxLength = Math.max(oldLines.length, newLines.length);
      for (let i = 0; i < maxLength; i++) {
        const oldLine = oldLines[i] || '';
        const newLine = newLines[i] || '';

        // Add old line (if it exists)
        if (oldLine) {
          diffOutput += `- ${oldLine.replace('// ', '')}\n`;
        }
        
        // Add new line (if it exists and isn't just a comment)
        if (newLine) {
          const trimmedLine = newLine.trim();
          const isJustComment = trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*');
          if (!isJustComment) {
            diffOutput += `+ ${newLine}\n`;
          }
        }
      }

      return (
        `diff --git a/Untranslated b/Translated\n` +
        `index 8d61203e12..1bc809e798 100644\n` +
        `--- a/Scripts\n` +
        `+++ b/Scripts\n` +
        `@@ -1,${oldLines.length} +1,${newLines.length} @@\n` +
        diffOutput
      );
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
      renderNothingWhenEmpty: true,
      matchingMaxComparisons: 2500,
      maxLineSizeInBlockForComparison: 200,
      outputFormat: 'line-by-line',
      drawFileList: false,
      synchronisedScroll: true,
      highlight: true,
      fileListToggle: false,
      fileListStartVisible: false,
      smartSelection: true,
      fileContentToggle: false,
      stickyFileHeaders: false,
      wordsThreshold: 0.01
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
