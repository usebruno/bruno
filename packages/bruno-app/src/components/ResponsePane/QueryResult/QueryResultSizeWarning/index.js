import React from 'react';

const QueryResultSizeWarning = ({ size, width, dismissWarning }) => {
  const sizeFormatted = (size / 1000 / 1000).toFixed(2);

  return (
    <div className={'mt-4 flex-col content-center'} style={{ maxWidth: width }}>
      <div className="text-red-500">Response is larger than 5 MB ({sizeFormatted} MB)</div>
      <div className="my-4">Showing too large responses will make Bruno unresponsive or could crash the app</div>

      <button className="submit btn btn-md btn-secondary" onClick={dismissWarning}>
        Show anyway
      </button>
    </div>
  );
};

export default QueryResultSizeWarning;
