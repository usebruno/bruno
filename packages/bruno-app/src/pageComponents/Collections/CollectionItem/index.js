import React, { useState } from 'react';
import { IconEdit, IconTrash } from "@tabler/icons";
import RenameCollection from 'components/Sidebar/Collections/Collection/RenameCollection';

export default function CollectionItem({collection}) {
  const [showRenameCollectionModal, setShowRenameCollectionModal] = useState(false);

  return (
    <>
      {showRenameCollectionModal && <RenameCollection collection={collection} onClose={() => setShowRenameCollectionModal(false)}/>}
      <div className="flex justify-between items-baseline mb-2 collection-list-item">
        <li style={{listStyle: 'none'}} className="collection-name">{collection.name}</li>
        <div className="flex gap-x-4" >
          <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setShowRenameCollectionModal(true)}/>
          <IconTrash className="cursor-pointer" size={20} strokeWidth={1.5}/>
        </div>
    </div>
    </>
  );
};
