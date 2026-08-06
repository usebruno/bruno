import React from 'react';
import BulkActionsDropdown from 'components/Sidebar/Collections/BulkActions';
import RemoveCollection from 'components/Sidebar/Collections/Collection/RemoveCollection';
import DeleteCollectionItems from 'components/Sidebar/Collections/DeleteCollectionItems';

const BulkActionsMenu = ({ menuProps }) => {
  if (!menuProps) return null;

  const {
    visible,
    setVisible,
    position,
    collectionUidsToRemove,
    setCollectionUidsToRemove,
    itemsToDelete,
    setItemsToDelete
  } = menuProps;

  return (
    <>
      {visible && (
        <BulkActionsDropdown
          visible={visible}
          onClose={() => setVisible(false)}
          position={position}
          onRequestRemoveCollections={setCollectionUidsToRemove}
          onRequestDeleteItems={setItemsToDelete}
        />
      )}
      {collectionUidsToRemove.length > 0 && (
        <RemoveCollection collectionUids={collectionUidsToRemove} onClose={() => setCollectionUidsToRemove([])} />
      )}
      {itemsToDelete.length > 0 && (
        <DeleteCollectionItems entries={itemsToDelete} onClose={() => setItemsToDelete([])} />
      )}
    </>
  );
};

export default BulkActionsMenu;
