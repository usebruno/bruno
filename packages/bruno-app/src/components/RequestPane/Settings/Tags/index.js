import React, { useCallback, useEffect } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { addRequestTag, deleteRequestTag, updateCollectionTagsList } from 'providers/ReduxStore/slices/collections';
import { makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import TagList from 'components/TagList/index';
import { getInheritedTagSourcesForItem } from 'utils/collections/index';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';

const Tags = ({ item, collection }) => {
  const dispatch = useDispatch();
  // all tags in the collection
  const collectionTags = collection.allTags || [];

  // tags for the current request
  const tags = item.draft ? get(item, 'draft.tags', []) : get(item, 'tags', []);

  // tags cascaded down from the folders this request sits in
  const inheritedTags = getInheritedTagSourcesForItem(collection, item);

  // Filter out tags the request already carries or inherits
  const assignedTags = [...tags, ...inheritedTags.map(({ tag }) => tag)];
  const tagsHintList = collectionTags?.filter((tag) => !assignedTags.includes(tag)) || [];

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
      dispatch(makeTabPermanent({ uid: item.uid }));
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
    dispatch(makeTabPermanent({ uid: item.uid }));
  }, [dispatch, item.uid, collection.uid]);

  const handleRequestSave = () => {
    dispatch(saveRequest(item.uid, collection.uid));
  };

  useEffect(() => {
    dispatch(updateCollectionTagsList({ collectionUid: collection.uid }));
  }, [collection.uid, dispatch]);

  return (
    <div className="flex flex-col">
      <TagList
        tagsHintList={tagsHintList}
        handleAddTag={handleAdd}
        handleRemoveTag={handleRemove}
        tags={tags}
        inheritedTags={inheritedTags}
        onSave={handleRequestSave}
        collectionFormat={collection.format}
      />
    </div>
  );
};

export default Tags;
