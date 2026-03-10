import React from 'react';
import WarningBanner from 'ui/WarningBanner';

const formatWarnings = (paths) => {
  const bullets = paths.map((p) => `  • ${p}`).join('\n');
  return `The following Postman APIs were not automatically converted during import and are not supported in Bruno:\n\n${bullets}\n\nYou may need to find an alternative approach for this functionality.`;
};

const ScriptWarning = ({ item, onClose }) => {
  const preRequestWarnings = item?.preRequestScriptWarnings;
  const postResponseWarnings = item?.postResponseScriptWarnings;
  const testWarnings = item?.testScriptWarnings;

  if (!preRequestWarnings?.length && !postResponseWarnings?.length && !testWarnings?.length) return null;

  const warnings = [];

  if (preRequestWarnings?.length) {
    warnings.push({
      title: 'Pre-Request Script Warning',
      message: formatWarnings(preRequestWarnings)
    });
  }

  if (postResponseWarnings?.length) {
    warnings.push({
      title: 'Post-Response Script Warning',
      message: formatWarnings(postResponseWarnings)
    });
  }

  if (testWarnings?.length) {
    warnings.push({
      title: 'Test Script Warning',
      message: formatWarnings(testWarnings)
    });
  }

  return <WarningBanner warnings={warnings} onClose={onClose} className="mt-4 mb-2" />;
};

export default ScriptWarning;
