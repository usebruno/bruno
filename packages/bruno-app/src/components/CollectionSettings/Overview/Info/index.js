import React from 'react';
import { getTotalRequestCountInCollection } from 'utils/collections/';
import { IconFolder, IconWorld, IconApi, IconShare, IconBook } from '@tabler/icons';
import { areItemsLoading, getItemsLoadStats } from 'utils/collections/index';
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import ShareCollection from 'components/ShareCollection/index';
import GenerateDocumentation from 'components/Sidebar/Collections/Collection/GenerateDocumentation';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import StyledWrapper from './StyledWrapper';

const Info = ({ collection }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const totalRequestsInCollection = getTotalRequestCountInCollection(collection);

  const isCollectionLoading = areItemsLoading(collection);
  const { loading: itemsLoadingCount, total: totalItems } = getItemsLoadStats(collection);
  const [showShareCollectionModal, toggleShowShareCollectionModal] = useState(false);
  const [showGenerateDocumentationModal, setShowGenerateDocumentationModal] = useState(false);

  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);

  const collectionEnvironmentCount = collection.environments?.length || 0;
  const globalEnvironmentCount = globalEnvironments?.length || 0;

  const handleToggleShowShareCollectionModal = (value) => (e) => {
    toggleShowShareCollectionModal(value);
  };

  return (
    <StyledWrapper className="w-full flex flex-col h-fit">
      <div className="rounded-lg py-6">
        <div className="grid gap-5">
          {/* Location Row */}
          <div className="flex items-start">
            <div className="icon-box location flex-shrink-0 p-3 rounded-lg">
              <IconFolder className="w-5 h-5" stroke={1.5} />
            </div>
            <div className="ml-4">
              <div className="font-medium">{t('COLLECTION_OVERVIEW.LOCATION')}</div>
              <div className="mt-1 text-muted break-all">
                {collection.pathname}
              </div>
            </div>
          </div>

          {/* Environments Row */}
          <div className="flex items-start">
            <div className="icon-box environments flex-shrink-0 p-3 rounded-lg">
              <IconWorld className="w-5 h-5" stroke={1.5} />
            </div>
            <div className="ml-4">
              <div className="font-medium">{t('COLLECTION_OVERVIEW.ENVIRONMENTS')}</div>
              <div className="mt-1 flex flex-col gap-1">
                <button
                  type="button"
                  className="text-link cursor-pointer hover:underline text-left bg-transparent"
                  onClick={() => {
                    dispatch(
                      addTab({
                        uid: `${collection.uid}-environment-settings`,
                        collectionUid: collection.uid,
                        type: 'environment-settings'
                      })
                    );
                  }}
                >
                  {t('COLLECTION_OVERVIEW.COLLECTION_ENVIRONMENTS', { count: collectionEnvironmentCount })}
                </button>
                <button
                  type="button"
                  className="text-link cursor-pointer hover:underline text-left bg-transparent"
                  onClick={() => {
                    dispatch(
                      addTab({
                        uid: `${collection.uid}-global-environment-settings`,
                        collectionUid: collection.uid,
                        type: 'global-environment-settings'
                      })
                    );
                  }}
                >
                  {t('COLLECTION_OVERVIEW.GLOBAL_ENVIRONMENTS', { count: globalEnvironmentCount })}
                </button>
              </div>
            </div>
          </div>

          {/* Requests Row */}
          <div className="flex items-start">
            <div className="icon-box requests flex-shrink-0 p-3 rounded-lg">
              <IconApi className="w-5 h-5" stroke={1.5} />
            </div>
            <div className="ml-4">
              <div className="font-medium">{t('COLLECTION_OVERVIEW.REQUESTS')}</div>
              <div className="mt-1 text-muted">
                {
                  isCollectionLoading
                    ? t('COLLECTION_OVERVIEW.REQUESTS_LOADING', { loaded: totalItems - itemsLoadingCount, total: totalItems })
                    : t('COLLECTION_OVERVIEW.REQUESTS_IN_COLLECTION', { count: totalRequestsInCollection })
                }
              </div>
            </div>
          </div>

          <div className="flex items-start group cursor-pointer" onClick={handleToggleShowShareCollectionModal(true)}>
            <div className="icon-box share flex-shrink-0 p-3 rounded-lg">
              <IconShare className="w-5 h-5" stroke={1.5} />
            </div>
            <div className="ml-4 h-full flex flex-col justify-start">
              <div className="font-medium h-fit my-auto">{t('COLLECTION_OVERVIEW.SHARE')}</div>
              <div className="group-hover:underline text-link">
                {t('COLLECTION_OVERVIEW.SHARE_COLLECTION')}
              </div>
            </div>
          </div>
          {showShareCollectionModal && <ShareCollection collectionUid={collection.uid} onClose={handleToggleShowShareCollectionModal(false)} />}

          <div className="flex items-start group cursor-pointer" onClick={() => setShowGenerateDocumentationModal(true)}>
            <div className="icon-box generate-docs flex-shrink-0 p-3 rounded-lg">
              <IconBook className="w-5 h-5" stroke={1.5} />
            </div>
            <div className="ml-4 h-full flex flex-col justify-start">
              <div className="font-medium h-fit my-auto">{t('COLLECTION_OVERVIEW.DOCUMENTATION')}</div>
              <div className="group-hover:underline text-link">
                {t('COLLECTION_OVERVIEW.GENERATE_DOCS')}
              </div>
            </div>
          </div>
          {showGenerateDocumentationModal && <GenerateDocumentation collectionUid={collection.uid} onClose={() => setShowGenerateDocumentationModal(false)} />}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Info;
