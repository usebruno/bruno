import React from 'react';
import { IconFileImport, IconApi, IconWorld, IconCalendar } from '@tabler/icons';

const Info = ({ collection, importSummaryData }) => {
  const importDate = importSummaryData?.importedAt
    ? new Date(importSummaryData.importedAt).toLocaleString()
    : 'Unknown';

  console.log('importSummaryData', importSummaryData);

  return (
    <div className="w-full flex flex-wrap justify-between h-fit gap-3">
      {/* Import Source Row */}
      <div className="flex items-start w-full sm:w-auto">
        <div className="flex-shrink-0 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <IconFileImport className="w-5 h-5 text-blue-500" stroke={1.5} />
        </div>
        <div className="ml-4">
          <div className="font-semibold text-sm">Import Source</div>
          <div className="mt-1 text-sm text-muted">{importSummaryData?.source || 'Unknown'}</div>
        </div>
      </div>

      {/* Import Date Row */}
      <div className="flex items-start w-full sm:w-auto">
        <div className="flex-shrink-0 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <IconCalendar className="w-5 h-5 text-purple-500" stroke={1.5} />
        </div>
        <div className="ml-4">
          <div className="font-semibold text-sm">Import Date</div>
          <div className="mt-1 text-sm text-muted">{importDate}</div>
        </div>
      </div>

      {/* API Count Row */}
      <div className="flex items-start w-full sm:w-auto">
        <div className="flex-shrink-0 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <IconApi className="w-5 h-5 text-green-500" stroke={1.5} />
        </div>
        <div className="ml-4">
          <div className="font-semibold text-sm">Imported APIs</div>
          <div className="mt-1 text-sm text-muted">{importSummaryData?.summary?.requests || 0} requests imported</div>
        </div>
      </div>
    </div>
  );
};

export default Info;
