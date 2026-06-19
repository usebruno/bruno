import React, { memo } from 'react';
import semver from 'semver';

const DEFAULT_VERSION = 'v1.0.0';

/**
 * Normalise a raw collection version for display: coerce partials to a full
 * major.minor.patch ("1" -> "v1.0.0", "2.1" -> "v2.1.0"), keep a single "v"
 * prefix, preserve pre-releases ("1.0.0-beta" -> "v1.0.0-beta"), and fall back to
 * the default when the version is unset or unparseable.
 */
const formatVersion = (version) => {
  const coerced = semver.coerce(version, { includePrerelease: true });
  return coerced ? `v${coerced.version}` : DEFAULT_VERSION;
};

/**
 * Read-only display of the collection's current version and a summary of its
 * contents (folder + request counts). Presentational and prop-driven so it can be
 * reused wherever the collection version needs to be shown.
 */
const CollectionVersionInfo = ({ version, folderCount = 0, requestCount = 0 }) => {
  const folderLabel = folderCount === 1 ? 'Folder' : 'Folders';
  const requestLabel = requestCount === 1 ? 'request' : 'requests';

  return (
    <div className="version-info" data-testid="version-info">
      <div className="version-line">
        <span className="version-label">Collection Version:</span>{' '}
        <span className="version-value" data-testid="version-value">{formatVersion(version)}</span>
      </div>
      <p className="version-summary" data-testid="version-summary">
        {`${folderCount} ${folderLabel} • ${requestCount} ${requestLabel}`}
      </p>
    </div>
  );
};

export default memo(CollectionVersionInfo);
