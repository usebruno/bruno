import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import Button from 'ui/Button';
import toast from 'react-hot-toast';
import { shareWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';

const ExportWorkspace = ({ workspace, onClose }) => {
  const dispatch = useDispatch();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportZip = async () => {
    if (!workspace?.uid || isExporting) return;

    setIsExporting(true);
    try {
      const result = await dispatch(shareWorkspaceAction(workspace.uid));
      if (!result?.canceled) {
        toast.success('Workspace exported successfully');
        onClose();
      }
    } catch (err) {
      toast.error(err?.message || 'Error exporting workspace');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Export this workspace as a ZIP file to back up or share with others.
      </p>
      <div className="modal-footer">
        <Button size="sm" onClick={handleExportZip} disabled={isExporting} loading={isExporting}>
          {isExporting ? 'Exporting...' : 'Export as ZIP'}
        </Button>
      </div>
    </div>
  );
};

export default ExportWorkspace;
