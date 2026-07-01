import React, { memo, Fragment } from 'react';

const CollectionVersionInfo = ({ name, version, folderCount = 0, requestCount = 0, environmentCount = 0 }) => {
  const folderLabel = folderCount === 1 ? 'Folder' : 'Folders';
  const requestLabel = requestCount === 1 ? 'request' : 'requests';

  return (
    <div className="version-info" data-testid="version-info">
      <div className="version-line">
        <span className="collection-name" data-testid="collection-name">{name}</span>
        {version ? (
          <span className="version-value" data-testid="version-value">{`Version: ${version}`}</span>
        ) : null}
      </div>
      <p className="version-summary" data-testid="version-summary">
        <span>{`${folderCount} ${folderLabel}`}</span>
        <span className="version-dot" aria-hidden="true" />
        <span>{`${requestCount} ${requestLabel}`}</span>
        {environmentCount === 0 ? (
          <Fragment>
            <span className="version-dot" aria-hidden="true" />
            <span>0 environments</span>
          </Fragment>
        ) : null}
      </p>
    </div>
  );
};

export default memo(CollectionVersionInfo);
