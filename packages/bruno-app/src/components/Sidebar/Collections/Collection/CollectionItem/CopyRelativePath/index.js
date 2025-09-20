import React from 'react';
import { useSelector } from 'react-redux';
import { findCollectionByUid, getTreePathFromCollectionToItem } from 'utils/collections/index';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const CopyRelativePath = ({ item, collectionUid, onClose }) => {
  // Get the collection object to calculate relative path
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));

  const handleCopyRelativePath = async () => {
    try {
      if (!collection) {
        toast.error('Collection not found');
        return;
      }

      // Get the tree path from collection to item
      const treePath = getTreePathFromCollectionToItem(collection, item);

      // Build the relative path by joining the names with forward slashes
      const relativePath = treePath.map((pathItem) => pathItem.name).join('/');

      // Copy to clipboard
      await navigator.clipboard.writeText(relativePath);
      toast.success('Relative path copied to clipboard');

      // Close the dropdown
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error copying relative path:', error);
      toast.error('Failed to copy relative path');
    }
  };

  // Execute immediately when component mounts
  React.useEffect(() => {
    handleCopyRelativePath();
  }, []);

  return <StyledWrapper />; // This component doesn't render anything visible, it just executes the action
};

export default CopyRelativePath;
