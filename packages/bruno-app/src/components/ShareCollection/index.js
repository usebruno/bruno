import React from 'react';
import Modal from 'components/Modal';
import { IconDownload, IconLoader2 } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import Bruno from 'components/Bruno';
import exportBrunoCollection from 'utils/collections/export';
import exportPostmanCollection from 'utils/exporters/postman-collection';
import { cloneDeep } from 'lodash';
import { transformCollectionToSaveToExportAsFile } from 'utils/collections/index';
import { useSelector } from 'react-redux';
import { findCollectionByUid, areItemsLoading } from 'utils/collections/index';

const ShareCollection = ({ onClose, collectionUid }) => {
  const collection = useSelector(state => findCollectionByUid(state.collections.collections, collectionUid));
  const isCollectionLoading = areItemsLoading(collection);
  
  const handleExportBrunoCollection = () => {
    const collectionCopy = cloneDeep(collection);
    exportBrunoCollection(transformCollectionToSaveToExportAsFile(collectionCopy));
    onClose();
  };

  const handleExportPostmanCollection = () => {
    const collectionCopy = cloneDeep(collection);
    exportPostmanCollection(collectionCopy);
    onClose();
  };

  return (
    <Modal
      size="md"
      title="Share Collection"
      confirmText="Close"
      handleConfirm={onClose}
      handleCancel={onClose}
      hideCancel
    >
      <StyledWrapper className="flex flex-col h-full w-[500px]">
          <div className="space-y-2"> 
            <div 
              className={`flex border border-gray-200 dark:border-gray-600 items-center p-3 rounded-lg transition-colors ${
                isCollectionLoading 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-500/10 cursor-pointer'
              }`}
              onClick={isCollectionLoading ? undefined : handleExportBrunoCollection}
            >
              <div className="mr-3 p-1 rounded-full">
                {isCollectionLoading ? (
                  <IconLoader2 size={28} className="animate-spin" />
                ) : (
                  <Bruno width={28} />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium">Bruno Collection</div>
                <div className="text-xs">
                  {isCollectionLoading ? 'Loading collection...' : 'Export in Bruno format'}
                </div>
              </div>
            </div>
            
            <div 
              className={`flex border border-gray-200 dark:border-gray-600 items-center p-3 rounded-lg transition-colors ${
                isCollectionLoading 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-500/10 cursor-pointer'
              }`}
              onClick={isCollectionLoading ? undefined : handleExportPostmanCollection}
            >
              <div className="mr-3 p-1 rounded-full">
                {isCollectionLoading ? (
                  <IconLoader2 size={28} className="animate-spin" />
                ) : (
                  <IconDownload size={28} strokeWidth={1} className="" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium">Postman Collection</div>
                <div className="text-xs">
                  {isCollectionLoading ? 'Loading collection...' : 'Export in Postman format'}
                </div>
              </div>
            </div>
          </div>
      </StyledWrapper>
    </Modal>
  );
};

export default ShareCollection;
