import React, { useState, useEffect } from 'react';
import StyledWrapper from "./StyledWrapper";
import { IconBox } from '@tabler/icons';
import Info from './Info';
import TreeView from './TreeView';
import DiffViewer from './DiffViewer';

const ImportSummary = ({ collection }) => {
  const [importSummaryData, setImportSummaryData] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const { ipcRenderer } = window;

  useEffect(() => {
    const loadImportSummary = async () => {
      try {
        const summaryData = await ipcRenderer.invoke('renderer:read-import-summary', collection.pathname);
        setImportSummaryData(summaryData);
      } catch (err) {
        console.error('Failed to load import summary:', err);
      }
    };

    loadImportSummary();
  }, [collection.pathname]);

  const handleRequestClick = (request) => {
    setSelectedRequest(request);
  };

  return (
    <div className="h-full">
      <div className="grid grid-cols-5 gap-4 h-full">
        <div className="col-span-2">
          <div className="text-xl font-semibold flex items-center gap-2">
            {/* <IconBox size={24} stroke={1.5} /> */}
            {/* {collection?.name} */}
          </div>
          {/* <Info collection={collection} importSummaryData={importSummaryData} /> */}
          {importSummaryData && (
            <TreeView 
              collection={importSummaryData.brunoCollectionUntranslated} 
              onRequestClick={handleRequestClick} // Pass the click handler
            />
          )}
        </div>
        <div className="col-span-3">
          {selectedRequest && 
          (
            <DiffViewer 
              untranslated={importSummaryData.brunoCollectionUntranslated} 
              translated={importSummaryData.brunoCollection} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportSummary;
