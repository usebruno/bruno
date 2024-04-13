import React from 'react';

const QueryResultError = ({ error, width }) => {
  return (
    <div className={'mt-4'}>
      <pre className="text-red-500 break-all whitespace-pre-wrap">{error}</pre>

      {error && typeof error === 'string' && error.toLowerCase().includes('self signed certificate') ? (
        <div className="mt-6 muted text-xs">
          You can disable SSL verification in the Preferences. <br />
          To open the Preferences, click on the gear icon in the bottom left corner.
        </div>
      ) : null}
    </div>
  );
};

export default QueryResultError;
