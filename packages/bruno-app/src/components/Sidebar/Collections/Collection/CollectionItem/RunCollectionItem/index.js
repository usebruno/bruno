import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import get from 'lodash/get';
import { uuid } from 'utils/common';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { runCollectionFolder } from 'providers/ReduxStore/slices/collections/actions';
import { flattenItems } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import { areItemsLoading } from 'utils/collections';
import RunnerTags from 'components/RunnerResults/RunnerTags/index';
import { getRequestItemsForCollectionRun } from 'utils/collections/index';
import Button from 'ui/Button';

const RunCollectionItem = ({ collectionUid, item, onClose }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [delay, setDelay] = useState('');

  const collection = useSelector((state) => state.collections.collections?.find((c) => c.uid === collectionUid));
  const isCollectionRunInProgress = collection?.runnerResult?.info?.status && (collection?.runnerResult?.info?.status !== 'ended');

  // tags for the collection run
  const tags = get(collection, 'runnerTags', { include: [], exclude: [] });

  const onSubmit = (recursive) => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'collection-runner'
      })
    );
    if (!isCollectionRunInProgress) {
      dispatch(runCollectionFolder(collection.uid, item ? item.uid : null, recursive, delay ? Number(delay) : null, tags));
    }
    onClose();
  };

  const handleViewRunner = (e) => {
    e.preventDefault();
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'collection-runner'
      })
    );
    onClose();
  };

  const isFolderLoading = areItemsLoading(item);

  const requestItemsForRecursiveFolderRun = getRequestItemsForCollectionRun({ recursive: true, tags, items: item ? item.items : collection.items });
  const totalRequestItemsCountForRecursiveFolderRun = requestItemsForRecursiveFolderRun.length;
  const shouldDisableRecursiveFolderRun = totalRequestItemsCountForRecursiveFolderRun <= 0;

  const requestItemsForFolderRun = getRequestItemsForCollectionRun({ recursive: false, tags, items: item ? item.items : collection.items });
  const totalRequestItemsCountForFolderRun = requestItemsForFolderRun.length;
  const shouldDisableFolderRun = totalRequestItemsCountForFolderRun <= 0;

  return (
    <StyledWrapper>
      <Modal size="md" title={t('SIDEBAR.COLLECTION_RUNNER')} hideFooter={true} handleCancel={onClose}>
        <div>
          <div className="mb-1">
            <span className="font-medium">{t('COMMON.RUN')}</span>
            <span className="ml-1 text-xs">({t('SIDEBAR.REQUESTS_COUNT', { count: totalRequestItemsCountForFolderRun })})</span>
          </div>
          <div className="mb-3 description">{t('SIDEBAR.FOLDER_RUN_DESC')}</div>
          <div className="mb-1">
            <span className="font-medium">{t('SIDEBAR.RECURSIVE_RUN')}</span>
            <span className="ml-1 text-xs">({t('SIDEBAR.REQUESTS_COUNT', { count: totalRequestItemsCountForRecursiveFolderRun })})</span>
          </div>
          <div className={`description ${isFolderLoading ? 'mb-2' : 'mb-6'}`}>{t('SIDEBAR.RECURSIVE_RUN_DESC')}</div>
          {isFolderLoading ? <div className="mb-8 warning">{t('SIDEBAR.REQUESTS_LOADING_WARNING')}</div> : null}
          {isCollectionRunInProgress ? <div className="mb-6 warning">{t('SIDEBAR.RUN_ALREADY_IN_PROGRESS')}</div> : null}

          <hr className="divider" />

          {/* Timings */}
          <div className="flex flex-col items-start gap-2 mb-8">
            <label htmlFor="runner-delay" className="block text-sm">{t('SIDEBAR.DELAY_BETWEEN_REQUESTS_MS')}</label>
            <input
              id="runner-delay"
              type="number"
              className="textbox w-1/2"
              placeholder={t('SIDEBAR.DELAY_PLACEHOLDER')}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={delay}
              onChange={(e) => setDelay(e.target.value)}
            />
          </div>

          {/* Tags for the collection run */}
          <RunnerTags collectionUid={collection.uid} className="mb-6" />

          <div className="flex justify-end bruno-modal-footer">
            <Button type="button" color="secondary" variant="ghost" onClick={onClose} className="mr-3">
              {t('COMMON.CANCEL')}
            </Button>
            {
              isCollectionRunInProgress
                ? (
                    <Button type="submit" onClick={handleViewRunner}>
                      {t('SIDEBAR.VIEW_RUN')}
                    </Button>
                  )
                : (
                    <>
                      <Button type="submit" disabled={shouldDisableRecursiveFolderRun} onClick={() => onSubmit(true)} className="mr-3">
                        {t('SIDEBAR.RECURSIVE_RUN')}
                      </Button>
                      <Button type="submit" disabled={shouldDisableFolderRun} onClick={() => onSubmit(false)}>
                        {t('COMMON.RUN')}
                      </Button>
                    </>
                  )
            }
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default RunCollectionItem;
