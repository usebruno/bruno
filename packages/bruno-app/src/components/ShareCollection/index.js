import React, { useMemo } from 'react';
import Modal from 'components/Modal';
import { IconUpload, IconLoader2, IconAlertTriangle } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import Bruno from 'components/Bruno';
import exportBrunoCollection from 'utils/collections/export';
import exportPostmanCollection from 'utils/exporters/postman-collection';
import { cloneDeep } from 'lodash';
import { transformCollectionToSaveToExportAsFile } from 'utils/collections/index';
import { useSelector } from 'react-redux';
import { findCollectionByUid, areItemsLoading } from 'utils/collections/index';

const ShareCollection = ({ onClose, collectionUid }) => {
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));
  const isCollectionLoading = areItemsLoading(collection);

  const hasNonExportableRequestTypes = useMemo(() => {
    let types = new Set();
    const checkItem = (item) => {
      if (item.type === 'grpc-request') {
        types.add('gRPC');
        return true;
      }
      if (item.type === 'ws-request') {
        types.add('WebSocket');
        return true;
      }
      if (item.items) {
        return item.items.some(checkItem);
      }
      return false;
    };
    return {
      has: collection?.items?.filter(checkItem).length || false,
      types: [...types]
    };
  }, [collection]);

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
            className={`export-option flex items-center p-3 rounded-lg ${
              isCollectionLoading ? 'disabled' : 'cursor-pointer'
            }`}
            onClick={isCollectionLoading ? undefined : handleExportBrunoCollection}
          >
            <div className="mr-3 p-1 rounded-full">
              {isCollectionLoading ? <IconLoader2 size={28} className="animate-spin" /> : <Bruno width={28} />}
            </div>
            <div className="flex-1">
              <div className="font-medium">Bruno Collection</div>
              <div className="text-xs">{isCollectionLoading ? 'Loading collection...' : 'Export in Bruno format'}</div>
            </div>
          </div>

          <div
            className={`export-option flex flex-col items-center rounded-lg ${
              isCollectionLoading ? 'disabled' : 'cursor-pointer'
            }`}
            onClick={isCollectionLoading ? undefined : handleExportPostmanCollection}
          >
            {hasNonExportableRequestTypes.has && (
              <div className="warning-banner px-3 py-2 w-full text-xs flex items-center">
                <IconAlertTriangle size={16} className="mr-2 flex-shrink-0" />
                <span>
                  Note:
                  {hasNonExportableRequestTypes.types.join(', ')}
                  {' '}
                  requests in this collection will not be exported
                </span>
              </div>
            )}
            <div className="flex items-center p-3 w-full">
              <div className="mr-3 p-1 rounded-full">
                {isCollectionLoading ? (
                  <IconLoader2 size={28} className="animate-spin" />
                ) : (
                  <IconUpload size={28} strokeWidth={1} className="" />
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
        </div>
      </StyledWrapper>
    </Modal>
  );
};

export default ShareCollection;
