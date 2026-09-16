import React, { useCallback, useEffect } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { addRequestTag, deleteRequestTag, updateCollectionTagsList } from 'providers/ReduxStore/slices/collections';
import { makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import TagList from 'components/TagList/index';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { getInheritedTagsWithSource } from 'utils/collections';

const Tags = ({ item, collection }) => {
  const dispatch = useDispatch();
  // all tags in the collection
  const collectionTags = collection.allTags || [];

  // tags for the current request
  const tags = item.draft ? get(item, 'draft.tags', []) : get(item, 'tags', []);

  // Filter out tags that are already associated with the current request
  const collectionTagsWithoutCurrentRequestTags = collectionTags?.filter((tag) => !tags.includes(tag)) || [];

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

  // tags coming from parent folders already apply to this request, so reject duplicates
  const handleValidation = (tag) => {
    const inherited = getInheritedTagsWithSource(collection, item).find((entry) => entry.tag === tag.trim());
    return inherited ? `Tag "${tag.trim()}" already exists on parent folder "${inherited.folderName}"` : '';
  };

  const handleRequestSave = () => {
    dispatch(saveRequest(item.uid, collection.uid));
  };

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
        handleValidation={handleValidation}
        collectionFormat={collection.format}
      />
    </div>
  );
};

export default Tags;
