import React from 'react';
import WarningBanner from 'ui/WarningBanner';

const formatWarnings = (paths) => {
  return paths.map((p) => `"${p}" is a Postman API that is not supported in Bruno.`).join('\n');
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
