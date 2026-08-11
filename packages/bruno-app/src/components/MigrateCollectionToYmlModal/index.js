import React, { useMemo, useState } from 'react';
import filter from 'lodash/filter';
import each from 'lodash/each';
import { useDispatch, useSelector } from 'react-redux';
import { IconAlertTriangle, IconDeviceFloppy } from '@tabler/icons';
import toast from 'react-hot-toast';
import {
  migrateCollectionToYml,
  cancelMigrateCollectionToYml,
  saveRequest,
  saveMultipleRequests,
  saveMultipleCollections,
  saveMultipleFolders,
  saveEnvironment
} from 'providers/ReduxStore/slices/collections/actions';
import {
  deleteRequestDraft,
  deleteCollectionDraft,
  deleteFolderDraft,
  clearEnvironmentsDraft
} from 'providers/ReduxStore/slices/collections';
import { hideMigrateToYmlModal } from 'providers/ReduxStore/slices/collection-migration';
import {
  findCollectionByUid,
  findEnvironmentInCollection,
  flattenItems,
  hasRequestChanges,
  isItemARequest
} from 'utils/collections';
import { pluralizeWord } from 'utils/common';
import { getInvalidVariableNames } from 'utils/common/variables';
import { isEnvironmentValidationError } from 'utils/environments';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const PHASE_LABELS = {
  parsing: 'Converting files',
  writing: 'Writing yml files',
  finalizing: 'Removing bru files'
};

const MAX_UNSAVED_ITEMS_TO_SHOW = 5;

const collectCollectionDrafts = (collection) => {
  if (!collection) {
    return [];
  }

  const drafts = [];

  if (collection.draft) {
    drafts.push({
      type: 'collection',
      name: collection.name,
      collectionUid: collection.uid
    });
  }

  if (collection.environmentsDraft) {
    const { environmentUid, variables } = collection.environmentsDraft;
    const environment = findEnvironmentInCollection(collection, environmentUid);
    if (environment && variables) {
      drafts.push({
        type: 'collection-environment',
        name: environment.name,
        environmentUid,
        variables,
        collectionUid: collection.uid
      });
    }
  }

  const items = flattenItems(collection.items);

  each(filter(items, (item) => item.type === 'folder' && item.draft), (folder) => {
    drafts.push({
      type: 'folder',
      name: folder.name,
      folderUid: folder.uid,
      collectionUid: collection.uid
    });
  });

  each(filter(items, (item) => isItemARequest(item) && hasRequestChanges(item)), (item) => {
    drafts.push({
      ...item,
      collectionUid: collection.uid
    });
  });

  return drafts;
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
  const [isResolvingDrafts, setIsResolvingDrafts] = useState(false);
  const [showDraftsStep, setShowDraftsStep] = useState(false);

  const collectionDrafts = useMemo(() => collectCollectionDrafts(collection), [collection]);

  if (migration.status === 'idle') {
    return null;
  }

  const isMigrating = migration.status === 'migrating' || migration.status === 'cancelling';
  const isCancelling = migration.status === 'cancelling';
  // Migration walks the whole collection tree on disk; kicking it off before the mount
  // finishes races with the watcher's initial scan and can leave the tree half-loaded.
  const isCollectionMounted = collection?.mountStatus === 'mounted';

  const startMigration = () => {
    dispatch(migrateCollectionToYml(migration.collectionUid)).catch(() => {});
  };

  const handleMigrateClick = () => {
    if (collectionDrafts.length > 0) {
      setShowDraftsStep(true);
      return;
    }
    startMigration();
  };

  const handleCancelMigration = () => {
    dispatch(cancelMigrateCollectionToYml(migration.collectionUid)).catch(() => {});
  };

  const handleClose = () => {
    setShowDraftsStep(false);
    setIsResolvingDrafts(false);
    dispatch(hideMigrateToYmlModal());
  };

  const handleBackToConfirm = () => {
    if (isResolvingDrafts) return;
    setShowDraftsStep(false);
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

  const handleDiscardAllDrafts = () => {
    if (isResolvingDrafts) return;
    collectionDrafts.forEach((draft) => {
      switch (draft.type) {
        case 'collection':
          dispatch(deleteCollectionDraft({ collectionUid: draft.collectionUid }));
          break;
        case 'folder':
          dispatch(deleteFolderDraft({ collectionUid: draft.collectionUid, folderUid: draft.folderUid }));
          break;
        case 'collection-environment':
          dispatch(clearEnvironmentsDraft({ collectionUid: draft.collectionUid }));
          break;
        default:
          dispatch(deleteRequestDraft({ collectionUid: draft.collectionUid, itemUid: draft.uid }));
          break;
      }
    });
    setShowDraftsStep(false);
    startMigration();
  };

  const handleSaveAllDrafts = async () => {
    if (isResolvingDrafts) return;
    setIsResolvingDrafts(true);
    try {
      const collectionLevelDrafts = collectionDrafts.filter((d) => d.type === 'collection');
      const folderDrafts = collectionDrafts.filter((d) => d.type === 'folder');
      const requestDrafts = collectionDrafts.filter((d) => isItemARequest(d));
      const transientRequestDrafts = requestDrafts.filter((d) => d.isTransient);
      const nonTransientRequestDrafts = requestDrafts.filter((d) => !d.isTransient);
      const environmentDrafts = collectionDrafts.filter((d) => d.type === 'collection-environment');

      if (collectionLevelDrafts.length > 0) {
        await dispatch(saveMultipleCollections(collectionLevelDrafts));
      }

      if (folderDrafts.length > 0) {
        await dispatch(saveMultipleFolders(folderDrafts));
      }

      if (nonTransientRequestDrafts.length > 0) {
        await dispatch(saveMultipleRequests(nonTransientRequestDrafts));
      }

      if (transientRequestDrafts.length > 0) {
        // Transient requests have no on-disk file yet; each must be saved individually
        // (Save As dialog). Keep the drafts step open so the user can finish them.
        await Promise.all(
          transientRequestDrafts.map((draft) =>
            dispatch(saveRequest(draft.uid, draft.collectionUid, true)).catch(() => null)
          )
        );
        return;
      }

      let hasSkippedEnvs = false;
      for (const draft of environmentDrafts) {
        const invalidNames = getInvalidVariableNames(draft.variables);
        if (invalidNames.length > 0) {
          hasSkippedEnvs = true;
          toast.error(`Cannot save environment "${draft.name}": invalid variable name(s) — ${invalidNames.join(', ')}`);
          continue;
        }

        try {
          await dispatch(saveEnvironment(draft.variables, draft.environmentUid, draft.collectionUid));
        } catch (err) {
          hasSkippedEnvs = true;
          toast.error(
            isEnvironmentValidationError(err)
              ? `Cannot save environment "${draft.name}": ${err.message}`
              : `Failed to save environment "${draft.name}"`
          );
        }
      }

      if (hasSkippedEnvs) {
        return;
      }

      setShowDraftsStep(false);
      startMigration();
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setIsResolvingDrafts(false);
    }
  };

  const handleSaveTransient = (draft) => {
    dispatch(saveRequest(draft.uid, draft.collectionUid)).catch(() => {});
  };

  const transientRequestDrafts = collectionDrafts.filter((d) => isItemARequest(d) && d.isTransient);
  const hasBlockingTransients = transientRequestDrafts.length > 0;

  const renderDraftLabel = (draft) => {
    switch (draft.type) {
      case 'collection':
        return `Collection: ${draft.name}`;
      case 'folder':
        return `Folder: ${draft.name}`;
      case 'collection-environment':
        return `Environment: ${draft.name}`;
      default:
        return `Request: ${draft.filename || draft.name}`;
    }
  };

  if (showDraftsStep && migration.status === 'confirming') {
    const totalDraftsCount = collectionDrafts.length;
    return (
      <StyledWrapper>
        <Modal
          size="md"
          title="Unsaved changes"
          dataTestId="migration-drafts-step"
          handleCancel={handleBackToConfirm}
          disableEscapeKey={true}
          disableCloseOnOutsideClick={true}
          closeModalFadeTimeout={150}
          hideFooter={true}
        >
          <div className="flex items-center">
            <IconAlertTriangle size={32} strokeWidth={1.5} className="warning-text" />
            <h1 className="ml-2 text-lg font-medium">Hold on..</h1>
          </div>
          <p className="mt-4">
            You have unsaved changes in <span className="font-medium">{totalDraftsCount}</span>{' '}
            {pluralizeWord('item', totalDraftsCount)}. Save or discard them before migrating.
          </p>

          <ul className="mt-4 ml-2">
            {collectionDrafts.slice(0, MAX_UNSAVED_ITEMS_TO_SHOW).map((draft, index) => (
              <li key={`${draft.type || 'request'}-${draft.uid || draft.folderUid || draft.environmentUid || draft.collectionUid}-${index}`} className="mt-1 text-xs">
                • {renderDraftLabel(draft)}
              </li>
            ))}
          </ul>

          {totalDraftsCount > MAX_UNSAVED_ITEMS_TO_SHOW && (
            <p className="ml-2 mt-1 text-xs">
              ...{totalDraftsCount - MAX_UNSAVED_ITEMS_TO_SHOW} additional{' '}
              {pluralizeWord('item', totalDraftsCount - MAX_UNSAVED_ITEMS_TO_SHOW)} not shown
            </p>
          )}

          {hasBlockingTransients && (
            <div className="mt-4">
              <p className="text-xs mb-2">
                Transient requests need to be saved individually before migrating.
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {transientRequestDrafts.map((item) => (
                  <div
                    key={item.uid}
                    className="flex items-center justify-between py-2 px-3 transient-item"
                    data-testid="migration-drafts-transient-row"
                    data-transient-name={item.name}
                  >
                    <span className="text-sm truncate mr-3">{item.name}</span>
                    <Button
                      data-testid="migration-drafts-transient-save"
                      color="primary"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveTransient(item)}
                      icon={<IconDeviceFloppy size={14} strokeWidth={1.5} />}
                    >
                      Save
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <div>
              <Button
                data-testid="migration-drafts-discard-all"
                color="danger"
                onClick={handleDiscardAllDrafts}
                disabled={isResolvingDrafts}
              >
                Discard All
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                data-testid="migration-drafts-back"
                color="secondary"
                variant="ghost"
                onClick={handleBackToConfirm}
                disabled={isResolvingDrafts}
              >
                Back
              </Button>
              <Button
                data-testid="migration-drafts-save-all"
                onClick={handleSaveAllDrafts}
                disabled={isResolvingDrafts || hasBlockingTransients}
                title={hasBlockingTransients ? 'Save transient requests individually first' : ''}
              >
                {isResolvingDrafts ? 'Saving…' : totalDraftsCount > 1 ? 'Save All and Migrate' : 'Save and Migrate'}
              </Button>
            </div>
          </div>
        </Modal>
      </StyledWrapper>
    );
  }

  const confirmDisabled = isMigrating ? isCancelling : isExporting || !isCollectionMounted;
  const progressPercent = migration.total ? Math.round((migration.current / migration.total) * 100) : 0;
  const progressLabel = migration.phase
    ? `${PHASE_LABELS[migration.phase] || migration.phase}: ${migration.current}/${migration.total}`
    : 'Preparing…';

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title="Migrate to YML format"
        confirmText={isMigrating ? (isCancelling ? 'Cancelling…' : 'Cancel') : 'Migrate'}
        confirmButtonColor={isMigrating ? 'danger' : 'primary'}
        confirmDisabled={confirmDisabled}
        handleConfirm={isMigrating ? handleCancelMigration : handleMigrateClick}
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
            <div
              className="migration-progress mt-4"
              data-testid="migration-progress"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={isCancelling ? 'Cancelling and restoring the collection' : progressLabel}
            >
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
  );
};

export default MigrateCollectionToYmlModal;
