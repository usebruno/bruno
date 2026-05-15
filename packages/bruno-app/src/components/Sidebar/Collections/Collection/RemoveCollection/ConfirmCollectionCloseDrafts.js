import React, { useMemo } from 'react';
import filter from 'lodash/filter';
import { useDispatch, useSelector } from 'react-redux';
import { flattenItems, isItemARequest, hasRequestChanges, findCollectionByUid } from 'utils/collections';
import { pluralizeWord } from 'utils/common';
import { saveRequest, saveMultipleRequests } from 'providers/ReduxStore/slices/collections/actions';
import { deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';
import { IconAlertTriangle, IconDeviceFloppy } from '@tabler/icons';
import Modal from 'components/Modal';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const MAX_UNSAVED_REQUESTS_TO_SHOW = 5;

const ConfirmCollectionCloseDrafts = ({ onClose, collection, collectionUid }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const latestCollection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));

  const activeCollection = latestCollection || collection;

  const currentDrafts = useMemo(() => {
    if (!activeCollection) return [];
    const items = flattenItems(activeCollection.items);
    return items
      ?.filter((item) => isItemARequest(item) && hasRequestChanges(item) && !item.isTransient)
      .map((item) => {
        return {
          ...item,
          collectionUid: collectionUid
        };
      });
  }, [activeCollection, collectionUid]);

  const currentTransientDrafts = useMemo(() => {
    if (!activeCollection) return [];
    const items = flattenItems(activeCollection.items);
    return items
      ?.filter((item) => isItemARequest(item) && hasRequestChanges(item) && item.isTransient)
      .map((item) => {
        return {
          ...item,
          collectionUid: collectionUid
        };
      });
  }, [activeCollection, collectionUid]);

  const allDrafts = useMemo(() => {
    return [...currentDrafts, ...currentTransientDrafts];
  }, [currentDrafts, currentTransientDrafts]);

  const handleSaveAll = () => {
    // If there are transient drafts, we can't proceed with batch save
    if (currentTransientDrafts.length > 0) {
      toast.error(t('SIDEBAR_COLLECTIONS.SAVE_TRANSIENT_FIRST'));
      return;
    }
    // Save only non-transient drafts
    if (currentDrafts.length > 0) {
      dispatch(saveMultipleRequests(currentDrafts))
        .then(() => {
          dispatch(removeCollection(collectionUid))
            .then(() => {
              toast.success(t('SIDEBAR_COLLECTIONS.COLLECTION_REMOVED'));
              onClose();
            })
            .catch(() => toast.error(t('SIDEBAR_COLLECTIONS.REMOVE_COLLECTION_ERROR')));
        })
        .catch(() => {
          toast.error(t('SIDEBAR_COLLECTIONS.SAVE_REQUESTS_ERROR'));
        });
    } else {
      // No non-transient drafts, just remove the collection
      dispatch(removeCollection(collectionUid))
        .then(() => {
          toast.success(t('SIDEBAR_COLLECTIONS.COLLECTION_REMOVED'));
          onClose();
        })
        .catch(() => toast.error(t('SIDEBAR_COLLECTIONS.REMOVE_COLLECTION_ERROR')));
    }
  };

  const handleDiscardAll = () => {
    // Discard all drafts (both regular and transient)
    allDrafts.forEach((draft) => {
      dispatch(deleteRequestDraft({
        collectionUid: collectionUid,
        itemUid: draft.uid
      }));
    });

    // Then remove the collection
    dispatch(removeCollection(collectionUid))
      .then(() => {
        toast.success(t('SIDEBAR_COLLECTIONS.COLLECTION_REMOVED'));
        onClose();
      })
      .catch(() => toast.error(t('SIDEBAR_COLLECTIONS.REMOVE_COLLECTION_ERROR')));
  };

  const handleSaveTransient = (draft) => {
    dispatch(saveRequest(draft.uid, collectionUid));
  };

  if (!currentDrafts.length && !currentTransientDrafts.length) {
    return null;
  }

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title={t('SIDEBAR_COLLECTIONS.REMOVE_COLLECTION')}
        confirmText={t('SIDEBAR_COLLECTIONS.SAVE_AND_REMOVE')}
        cancelText={t('SIDEBAR_COLLECTIONS.REMOVE_WITHOUT_SAVING')}
        handleCancel={onClose}
        disableEscapeKey={true}
        disableCloseOnOutsideClick={true}
        closeModalFadeTimeout={150}
        hideFooter={true}
      >
        <div className="flex items-center">
          <IconAlertTriangle size={32} strokeWidth={1.5} className="warning-text" />
          <h1 className="ml-2 text-lg font-medium">{t('SIDEBAR_COLLECTIONS.HOLD_ON')}</h1>
        </div>
        <p className="mt-4">
          {t('SIDEBAR_COLLECTIONS.UNSAVED_CHANGES_IN')} <span className="font-medium">{allDrafts.length}</span>{' '}
          {pluralizeWord(t('SIDEBAR_COLLECTIONS.REQUEST'), allDrafts.length)}.
        </p>

        {/* Regular (saved) requests with changes */}
        {currentDrafts.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">
              {t('SIDEBAR_COLLECTIONS.SAVED_REQUESTS', { count: currentDrafts.length })} ({currentDrafts.length})
            </p>
            <ul className="ml-2">
              {currentDrafts.slice(0, MAX_UNSAVED_REQUESTS_TO_SHOW).map((item) => {
                return (
                  <li key={item.uid} className="mt-1 text-xs draft-list-item">
                    • {item.filename || item.name}
                  </li>
                );
              })}
            </ul>
            {currentDrafts.length > MAX_UNSAVED_REQUESTS_TO_SHOW && (
              <p className="ml-2 mt-1 text-xs draft-list-item">
                ...{currentDrafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW} {t('SIDEBAR_COLLECTIONS.ADDITIONAL_REQUESTS', { count: currentDrafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW })}
              </p>
            )}
          </div>
        )}

        {/* Transient (unsaved) requests */}
        {currentTransientDrafts.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">
              {t('SIDEBAR_COLLECTIONS.TRANSIENT_REQUESTS', { count: currentTransientDrafts.length })} ({currentTransientDrafts.length})
            </p>
            <p className="text-xs transient-hint mb-3">
              {t('SIDEBAR_COLLECTIONS.TRANSIENT_HINT')}
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {currentTransientDrafts.map((item) => {
                return (
                  <div
                    key={item.uid}
                    className="flex items-center justify-between py-2 px-3 transient-item"
                  >
                    <span className="text-sm transient-item-name truncate mr-3">{item.name}</span>
                    <Button
                      color="primary"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveTransient(item)}
                      icon={<IconDeviceFloppy size={14} strokeWidth={1.5} />}
                    >
                      {t('COMMON.SAVE')}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <div>
            <Button color="danger" onClick={handleDiscardAll}>
              {t('SIDEBAR_COLLECTIONS.DISCARD_ALL_AND_REMOVE')}
            </Button>
          </div>
          <div>
            <Button className="mr-2" color="secondary" variant="ghost" onClick={onClose}>
              {t('COMMON.CANCEL')}
            </Button>
            <Button
              onClick={handleSaveAll}
              disabled={currentTransientDrafts.length > 0}
              title={currentTransientDrafts.length > 0 ? t('SIDEBAR_COLLECTIONS.SAVE_TRANSIENT_FIRST') : ''}
            >
              {currentDrafts.length > 1 ? t('SIDEBAR_COLLECTIONS.SAVE_ALL_AND_REMOVE') : t('SIDEBAR_COLLECTIONS.SAVE_AND_REMOVE')}
            </Button>
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default ConfirmCollectionCloseDrafts;
