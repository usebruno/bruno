import React, { useState, useEffect } from 'react';
import { html, parse } from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';
// import 'diff2html/bundles/css/diff2html-summary.min.css';

const DiffViewer = ({ untranslated, translated }) => {
  const [diffHtml, setDiffHtml] = useState('');

  useEffect(() => {
    const untranslatedCode = untranslated?.items[0]?.request?.script.req || '';
    const translatedCode = translated?.items[0]?.request?.script.req || '';

    if (!untranslatedCode || !translatedCode) {
      console.error('Invalid untranslated or translated code');
      return;
    }

    const generateDiff = (oldCode, newCode) => {
      return (
        `diff --git a/Untranslated b/Translated\n` +
        `index 8d61203e12..1bc809e798 100644\n` +
        `--- a/Scripts\n` +
        `+++ b/Scripts\n` +
        `@@ -1,${oldCode.split('\n').length} +1,${newCode.split('\n').length} @@\n` +
        oldCode
          .split('\n')
          .map((line) => `- ${line.replace('// ', '')}\n`)
          .join('') +
        newCode
          .split('\n')
          .map((line) => `+ ${line}\n`)
          .join('')
      );
    };

    const diffText = generateDiff(untranslatedCode, translatedCode);
    const diffData = parse(diffText);

    const htmlDiff = html(diffData, {
      matching: 'lines',
      matchWordsThreshold: 0.25,
      maxLineLengthHighlight: 10000,
      diffStyle: 'word',
      //   colorScheme: 'github',
      colorscheme: 'auto',
      renderNothingWhenEmpty: false,
      matchingMaxComparisons: 2500,
      maxLineSizeInBlockForComparison: 200,
      outputFormat: 'side-by-side',
      drawFileList: true,
      synchronisedScroll: true,
      highlight: true,
      fileListToggle: true,
      fileListStartVisible: false,
      smartSelection: true,
      fileContentToggle: true,
      stickyFileHeaders: true,
      wordsThreshold: 0.05
    });

    setDiffHtml(htmlDiff);
  }, [untranslated, translated]);

  return (
    <div className="diff-viewer-container">
      {/* <h2>Code Diff Viewer</h2> */}
      <div className="diff-viewer">
        <div className="diff-header">
          {/* <div className="diff-column">Untranslated</div>
          <div className="diff-column">Translated</div> */}
        </div>
        <div className="diff-content" dangerouslySetInnerHTML={{ __html: diffHtml }} />
      </div>
    </div>
  );
};

export default DiffViewer;
