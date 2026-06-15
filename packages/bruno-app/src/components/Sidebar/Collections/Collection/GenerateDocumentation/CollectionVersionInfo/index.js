import React, { memo } from 'react';
import { formatCollectionVersion } from 'utils/collections/index';

/**
 * Read-only display of the collection's current version and a summary of its
 * contents (folder + request counts). Presentational and prop-driven so it can be
 * reused wherever the collection version needs to be shown. Version formatting is
 * delegated to `formatCollectionVersion` for consistency across the UI.
 */
const CollectionVersionInfo = ({ version, folderCount = 0, requestCount = 0 }) => {
  const folderLabel = folderCount === 1 ? 'Folder' : 'Folders';
  const requestLabel = requestCount === 1 ? 'request' : 'requests';

  return (
    <div className="version-info">
      <div className="version-line">
        <span className="version-label">Collection Version:</span>{' '}
        <span className="version-value">{formatCollectionVersion(version)}</span>
      </div>
      <p className="version-summary">
        {`${folderCount} ${folderLabel} • ${requestCount} ${requestLabel}`}
      </p>
    </div>
  );
};

export default memo(CollectionVersionInfo);
