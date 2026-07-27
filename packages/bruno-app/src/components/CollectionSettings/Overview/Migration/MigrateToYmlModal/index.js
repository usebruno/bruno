import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { migrateCollectionToYml } from 'providers/ReduxStore/slices/collections/actions';
import Modal from 'components/Modal';
import Portal from 'components/Portal';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const MigrateToYmlModal = ({ collection, onClose }) => {
  const dispatch = useDispatch();
  const [isMigrating, setIsMigrating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleMigrate = () => {
    setIsMigrating(true);
    dispatch(migrateCollectionToYml(collection.uid))
      .catch(() => {})
      .finally(() => {
        setIsMigrating(false);
        onClose();
      });
  };

  const handleExportBackup = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:export-collection-zip', collection.pathname, collection.name);
      if (result?.success) {
        toast.success('Collection backup exported');
      }
    } catch (error) {
      toast.error('Failed to export backup: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="md"
          title="Migrate to YML format"
          confirmText="Migrate"
          confirmDisabled={isExporting || isMigrating}
          handleConfirm={handleMigrate}
          handleCancel={onClose}
        >
          <div>
            <p>
              This will convert all files in <strong>{collection.name}</strong> from <code>.bru</code> format to <code>.yml</code> format.
            </p>
            <div className="mt-4 text-sm text-muted">
              <p className="font-medium mb-2">What will happen:</p>
              <ul className="list-disc ml-5 flex flex-col gap-1">
                <li>All <code>.bru</code> request files will be converted to <code>.yml</code></li>
                <li>Environment files will be converted to YML format</li>
                <li><code>bruno.json</code> will be replaced with <code>opencollection.yml</code></li>
                <li>The collection will be reloaded after migration</li>
              </ul>
            </div>
            <div className="backup-section mt-4">
              <div className="backup-section-head">
                <span className="backup-section-title">Backup</span>
              </div>
              <p className="backup-section-help">
                Export this collection as a ZIP archive before migrating, in case you want to restore it later.
              </p>
              <div className="backup-section-action">
                <Button
                  data-testid="export-collection-backup-button"
                  size="sm"
                  color="secondary"
                  variant="outline"
                  onClick={handleExportBackup}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting…' : 'Export Collection'}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default MigrateToYmlModal;
