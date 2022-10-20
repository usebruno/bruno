import React, { useState } from 'react';
import { IconEdit, IconTrash } from '@tabler/icons';
import RenameCollection from 'components/Sidebar/Collections/Collection/RenameCollection';
import DeleteCollection from 'components/Sidebar/Collections/Collection/DeleteCollection';

export default function CollectionItem({ collection }) {
  const [showRenameCollectionModal, setShowRenameCollectionModal] = useState(false);
  const [showDeleteCollectionModal, setShowDeleteCollectionModal] = useState(false);

  return (
    <>
      {showRenameCollectionModal && <RenameCollection collection={collection} onClose={() => setShowRenameCollectionModal(false)} />}
      {showDeleteCollectionModal && <DeleteCollection collection={collection} onClose={() => setShowDeleteCollectionModal(false)} />}
      <div className="flex justify-between items-baseline mb-2 collection-list-item">
        <li style={{ listStyle: 'none' }} className="collection-name">
          {collection.name}
        </li>
        <div className="flex gap-x-4">
          <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setShowRenameCollectionModal(true)} />
          <IconTrash className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setShowDeleteCollectionModal(true)} />
        </div>
      </div>
    </>
  );
}
