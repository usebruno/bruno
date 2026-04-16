import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { IconRefresh } from '@tabler/icons';
import { migrateCollectionScripts } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid } from 'utils/collections/index';
import StyledWrapper from './StyledWrapper';

const MigrateCollection = ({ onClose, collectionUid }) => {
  const dispatch = useDispatch();
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));
  const [migrating, setMigrating] = useState(false);
  const [dryRunResult, setDryRunResult] = useState(null);

  if (!collection) {
    return <div>Collection not found</div>;
  }

  const handleDryRun = () => {
    setMigrating(true);
    dispatch(migrateCollectionScripts(collectionUid, { dryRun: true }))
      .then((result) => {
        setDryRunResult(result);
        if (result.results.summary.totalChanges === 0) {
          toast.success('No deprecated APIs found. Scripts are up to date.');
        }
      })
      .catch((err) => {
        toast.error(err.message || 'Error scanning collection');
      })
      .finally(() => setMigrating(false));
  };

  const handleMigrate = () => {
    setMigrating(true);
    dispatch(migrateCollectionScripts(collectionUid, { dryRun: false }))
      .then((result) => {
        const { totalChanges, filesChanged } = result.results.summary;
        if (totalChanges === 0) {
          toast.success('No deprecated APIs found. Scripts are up to date.');
        } else {
          toast.success(`Migrated ${totalChanges} API call(s) in ${filesChanged} file(s)`);
        }
        onClose();
      })
      .catch((err) => {
        toast.error(err.message || 'Error migrating collection');
      })
      .finally(() => setMigrating(false));
  };

  const hasPendingChanges = dryRunResult?.results?.summary?.totalChanges > 0;

  const customHeader = (
    <div className="flex items-center gap-2">
      <IconRefresh size={18} strokeWidth={1.5} />
      <span>Migrate Scripts</span>
    </div>
  );

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title="Migrate Scripts"
        customHeader={customHeader}
        confirmText={hasPendingChanges ? 'Migrate' : 'Scan'}
        handleConfirm={hasPendingChanges ? handleMigrate : handleDryRun}
        handleCancel={onClose}
        disableConfirm={migrating}
      >
        <p className="mb-3">
          Scan and migrate deprecated API calls in your collection scripts to the latest version.
        </p>

        <div className="text-sm text-muted mb-3">
          <strong>Collection:</strong> {collection.name}
        </div>

        {!dryRunResult && (
          <p className="text-sm text-muted">
            Click <strong>Scan</strong> to preview changes, then confirm to apply them.
          </p>
        )}

        {dryRunResult && (
          <div className="mt-3">
            {dryRunResult.results.summary.totalChanges === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-text-green, green)' }}>
                No deprecated APIs found. Your scripts are up to date.
              </p>
            ) : (
              <>
                <p className="text-sm mb-2">
                  Found <strong>{dryRunResult.results.summary.totalChanges}</strong> deprecated API call(s) in{' '}
                  <strong>{dryRunResult.results.summary.filesChanged}</strong> file(s):
                </p>
                <pre className="migration-report">{dryRunResult.report}</pre>
                <p className="text-sm mt-2 text-muted">
                  Click <strong>Migrate</strong> to apply these changes.
                </p>
              </>
            )}
          </div>
        )}

        {migrating && <p className="text-sm text-muted mt-2">Processing...</p>}
      </Modal>
    </StyledWrapper>
  );
};

export default MigrateCollection;
