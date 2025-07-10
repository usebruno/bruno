import React, { useCallback, useEffect } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { addRequestTag, deleteRequestTag, updateCollectionTagsList } from 'providers/ReduxStore/slices/collections';
import TagList from 'components/TagList/index';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';

const Tags = ({ item, collection }) => {
  const dispatch = useDispatch();
  // all tags in the collection
  const collectionTags = collection.allTags || [];

  // tags for the current request
  const tags = item.draft ? get(item, 'draft.request.tags', []) : get(item, 'request.tags', []);

  // Filter out tags that are already associated with the current request
  const collectionTagsWithoutCurrentRequestTags = collectionTags?.filter(tag => !tags.includes(tag)) || [];

  const handleAdd = useCallback((tag) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      dispatch(
        addRequestTag({
          tag: trimmedTag,
          itemUid: item.uid,
          collectionUid: collection.uid
        })
      );
    }
  }, [dispatch, tags, item.uid, collection.uid]);

  const handleRemove = useCallback((tag) => {
    dispatch(
      deleteRequestTag({
        tag,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  }, [dispatch, item.uid, collection.uid]);

  const handleRequestSave = () => {
    dispatch(saveRequest(item.uid, collection.uid));
  }

  useEffect(() => {
    dispatch(updateCollectionTagsList({ collectionUid: collection.uid }));
  }, [collection.uid, dispatch]);

  return (
    <div className="flex flex-col">
      <TagList 
        tagsHintList={collectionTagsWithoutCurrentRequestTags}
        handleAddTag={handleAdd} 
        handleRemoveTag={handleRemove}
        tags={tags}
        onSave={handleRequestSave}
      />
    </div>
  );
};

export default Tags; 