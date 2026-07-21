import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { migrateCollectionToYml, cancelMigrateCollectionToYml } from 'providers/ReduxStore/slices/collections/actions';
import { hideMigrateToYmlModal } from 'providers/ReduxStore/slices/collection-migration';
import { findCollectionByUid } from 'utils/collections';
import Modal from 'components/Modal';
import Portal from 'components/Portal';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const PHASE_LABELS = {
  parsing: 'Converting files',
  writing: 'Writing yml files',
  finalizing: 'Removing bru files'
};

// Rendered at app level (AppProvider) and driven by the collectionMigration slice: the
// collection is removed from the store while it migrates, so a modal hosted under the
// collection UI would unmount mid-migration.
const MigrateCollectionToYmlModal = () => {
  const dispatch = useDispatch();
  const migration = useSelector((state) => state.collectionMigration);
  // Present while confirming; gone during migration — name/pathname come from the slice.
  const collection = useSelector((state) =>
    findCollectionByUid(state.collections.collections, migration.collectionUid)
  );
  const [isExporting, setIsExporting] = useState(false);

  if (migration.status === 'idle') {
    return null;
  }

  const isMigrating = migration.status === 'migrating' || migration.status === 'cancelling';
  const isCancelling = migration.status === 'cancelling';
  // Migration walks the whole collection tree on disk; kicking it off before the mount
  // finishes races with the watcher's initial scan and can leave the tree half-loaded.
  const isCollectionMounted = collection?.mountStatus === 'mounted';

  const handleMigrate = () => {
    dispatch(migrateCollectionToYml(migration.collectionUid)).catch(() => {});
  };

  const handleCancelMigration = () => {
    dispatch(cancelMigrateCollectionToYml(migration.collectionUid));
  };

  const handleClose = () => {
    dispatch(hideMigrateToYmlModal());
  };

  const handleExportBackup = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke(
        'renderer:export-collection-zip',
        migration.collectionPathname,
        migration.collectionName
      );
      if (result?.success) {
        toast.success('Collection backup exported');
      }
    } catch (error) {
      toast.error('Failed to export backup: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const confirmDisabled = isMigrating ? isCancelling : isExporting || !isCollectionMounted;
  const progressPercent = migration.total ? Math.round((migration.current / migration.total) * 100) : 0;
  const progressLabel = migration.phase
    ? `${PHASE_LABELS[migration.phase] || migration.phase} — ${migration.current}/${migration.total}`
    : 'Preparing…';

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="md"
          title="Migrate to YML format"
          confirmText={isMigrating ? (isCancelling ? 'Cancelling…' : 'Cancel') : 'Migrate'}
          confirmButtonColor={isMigrating ? 'danger' : 'primary'}
          confirmDisabled={confirmDisabled}
          handleConfirm={isMigrating ? handleCancelMigration : handleMigrate}
          handleCancel={handleClose}
          hideCancel={isMigrating}
          hideClose={isMigrating}
          disableCloseOnOutsideClick={isMigrating}
          disableEscapeKey={isMigrating}
        >
          <div>
            <p>
              This will convert all files in <strong>{migration.collectionName}</strong> from <code>.bru</code> format to <code>.yml</code> format.
            </p>
            {isMigrating ? (
              <div className="migration-progress mt-4" data-testid="migration-progress">
                <div className="migration-progress-track">
                  <div
                    className="migration-progress-fill"
                    data-testid="migration-progress-bar"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="migration-progress-label" data-testid="migration-progress-label">
                  {isCancelling ? 'Cancelling and restoring the collection…' : progressLabel}
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 text-sm text-muted">
                  <p className="font-medium mb-2">What will happen:</p>
                  <ul className="list-disc ml-5 flex flex-col gap-1">
                    <li>All <code>.bru</code> request files will be converted to <code>.yml</code></li>
                    <li>Environment files will be converted to YML format</li>
                    <li><code>bruno.json</code> will be replaced with <code>opencollection.yml</code></li>
                    <li>Open tabs will be closed and the collection will be reloaded</li>
                  </ul>
                  {!isCollectionMounted && (
                    <p className="mt-3">Waiting for the collection to finish loading before migration can start…</p>
                  )}
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
              </>
            )}
          </div>
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default MigrateCollectionToYmlModal;
