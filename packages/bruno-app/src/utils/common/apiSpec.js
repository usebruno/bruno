const MAX_SKIPPED_FILES_LISTED = 5;

export const buildSkippedFilesMessage = (skipped, maxListed = MAX_SKIPPED_FILES_LISTED) => {
  const listed = skipped.slice(0, maxListed);
  const remaining = skipped.length - listed.length;
  const names = listed.join(', ');
  const summary = remaining > 0 ? `${names} and ${remaining} more` : names;
  const subject = skipped.length === 1 ? 'it was' : 'they were';
  return `Could not parse ${summary}; ${subject} skipped`;
};

export const buildExportWarningsMessage = (warnings) => {
  const label = warnings.length === 1 ? 'warning' : 'warnings';
  return `Created with ${warnings.length} ${label}; some request bodies could not be fully parsed`;
};

export const getCollectionImportError = (collectionData) => {
  if (!collectionData?.configFile) {
    return 'Could not load that collection. Pick a folder that contains a bruno.json or opencollection.yml.';
  }
  return null;
};
