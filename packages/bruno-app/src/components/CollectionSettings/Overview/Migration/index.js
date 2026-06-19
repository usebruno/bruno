import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { IconFileCode, IconTransform } from '@tabler/icons';
import toast from 'react-hot-toast';
import { migrateCollectionToYml } from 'providers/ReduxStore/slices/collections/actions';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const Migration = ({ collection }) => {
  const dispatch = useDispatch();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Only show for bru format collections
  if (collection.format !== 'bru') {
    return null;
  }

  const handleMigrate = () => {
    setIsMigrating(true);
    setShowConfirmModal(false);
    dispatch(migrateCollectionToYml(collection.uid))
      .catch(() => { })
      .finally(() => setIsMigrating(false));
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
    <StyledWrapper>
      <div className="migration-section">
        <div className="text-lg font-medium flex items-center gap-2 mb-4">
          <IconTransform size={20} stroke={1.5} />
          Migration
        </div>

        <div className="flex items-start">
          <div className="icon-box migration flex-shrink-0 p-3 rounded-lg">
            <IconFileCode className="w-5 h-5" stroke={1.5} />
          </div>
          <div className="ml-4">
            <div className="font-medium">Migrate to YML file format</div>
            <div className="my-1 text-muted text-sm">
              This collection is stored in BRU format.{' '}
              Switch to YML.{' '}
              <a
                href="https://blog.usebruno.com/making-yaml-the-default-in-bruno-v3.1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link hover:underline"
              >
                Learn More &#x2197;
              </a>
            </div>
            <Button
              data-testid="migrate-collection-to-yml-button"
              size="sm"
              color="primary"
              className="mt-2"
              onClick={() => setShowConfirmModal(true)}
              disabled={isMigrating}
              loading={isMigrating}
            >
              Convert to YML
            </Button>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <Modal
          size="md"
          title="Migrate to YML format"
          confirmText="Migrate"
          confirmDisabled={isExporting}
          handleConfirm={handleMigrate}
          handleCancel={() => setShowConfirmModal(false)}
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
      )}
    </StyledWrapper>
  );
};

export default Migration;
