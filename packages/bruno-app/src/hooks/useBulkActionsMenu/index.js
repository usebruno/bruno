import { useState } from 'react';

const useBulkActionsMenu = () => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [collectionUidsToRemove, setCollectionUidsToRemove] = useState([]);
  const [itemsToDelete, setItemsToDelete] = useState([]);

  const openBulkMenu = (event) => {
    setPosition({ x: event.clientX, y: event.clientY });
    setVisible(true);
  };

  const menuProps = {
    visible,
    setVisible,
    position,
    collectionUidsToRemove,
    setCollectionUidsToRemove,
    itemsToDelete,
    setItemsToDelete
  };

  return { openBulkMenu, menuProps };
};

export default useBulkActionsMenu;
