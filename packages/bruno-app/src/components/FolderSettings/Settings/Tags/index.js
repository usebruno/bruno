import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addFolderTag, deleteFolderTag } from 'providers/ReduxStore/slices/collections';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import { getInheritedTagSourcesForItem, getUniqueTagsFromItems } from 'utils/collections/index';
import TagList from 'components/TagList/index';
import { getFolderTags } from '@usebruno/common';

const Tags = ({ folder, collection }) => {
  const dispatch = useDispatch();

  const tags = getFolderTags(folder);

  // tags cascaded down from the folders above this one
  const inheritedTags = getInheritedTagSourcesForItem(collection, folder);

  // Requests and folders share one tag vocabulary, so each autocompletes the other. Derived
  // here rather than read from collection.allTags, which only refreshes on a tag action.
  const assignedTags = [...tags, ...inheritedTags.map(({ tag }) => tag)];
  const tagsHintList = getUniqueTagsFromItems(collection.items).filter((tag) => !assignedTags.includes(tag));

  const handleAddTag = useCallback((tag) => {
    dispatch(addFolderTag({ tag, folderUid: folder.uid, collectionUid: collection.uid }));
  }, [dispatch, folder.uid, collection.uid]);

  const handleRemoveTag = useCallback((tag) => {
    dispatch(deleteFolderTag({ tag, folderUid: folder.uid, collectionUid: collection.uid }));
  }, [dispatch, folder.uid, collection.uid]);

  const handleSave = useCallback(() => {
    dispatch(saveFolderRoot(collection.uid, folder.uid));
  }, [dispatch, collection.uid, folder.uid]);

  return (
    <div className="flex flex-col">
      <TagList
        tagsHintList={tagsHintList}
        handleAddTag={handleAddTag}
        handleRemoveTag={handleRemoveTag}
        tags={tags}
        inheritedTags={inheritedTags}
        onSave={handleSave}
        collectionFormat={collection.format}
      />
    </div>
  );
};

export default Tags;
