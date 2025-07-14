import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { get, cloneDeep, find } from 'lodash';
import { updateCollectionTagsList, updateRunnerTagsDetails } from 'providers/ReduxStore/slices/collections';
import TagList from 'components/TagList';

const RunnerTags = ({ collectionUid }) => {
  const dispatch = useDispatch();
  const collections = useSelector((state) => state.collections.collections);
  const collection = cloneDeep(find(collections, (c) => c.uid === collectionUid));
  
  // tags for the collection run
  const tags = get(collection, 'runnerTags', { include: [], exclude: [] });

  // have tags been enabled for the collection run
  const tagsEnabled = get(collection, 'runnerTagsEnabled', false);

  // all available tags in the collection that can be used for filtering
  const availableTags = get(collection, 'allTags', []);
  const tagsHintList = availableTags.filter(t => !tags.exclude.includes(t) && !tags.include.includes(t));

  useEffect(() => {
    dispatch(updateCollectionTagsList({ collectionUid }));
  }, [collection.uid, dispatch]);

  const handleValidation = (tag) => {
    const trimmedTag = tag.trim();
    if (!availableTags.includes(trimmedTag)) {
      return 'tag does not exist!';
    }
    if (tags.include.includes(trimmedTag)) {
      return 'tag already present in the include list!';
    }
    if (tags.exclude.includes(trimmedTag)) {
      return 'tag is present in the exclude list!';
    }
  }

  const handleAddTag = ({ tag, to }) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    // add tag to the `include` list
    if (to === 'include') {
      if (tags.include.includes(trimmedTag) || tags.exclude.includes(trimmedTag)) return;
      if (!availableTags.includes(trimmedTag)) {
        return;
      }
      const newTags = { ...tags, include: [...tags.include, trimmedTag].sort() };
      setTags(newTags);
      return;
    }
    // add tag to the `exclude` list
    if (to === 'exclude') {
      if (tags.include.includes(trimmedTag) || tags.exclude.includes(trimmedTag)) return;
      if (!availableTags.includes(trimmedTag)) {
        return;
      }
      const newTags = { ...tags, exclude: [...tags.exclude, trimmedTag].sort() };
      setTags(newTags);
    }
  };

  const handleRemoveTag = ({ tag, from }) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    // remove tag from the `include` list
    if (from === 'include') {
      if (!tags.include.includes(trimmedTag)) return;
      const newTags = { ...tags, include: tags.include.filter((t) => t !== trimmedTag) };
      setTags(newTags);
      return;
    }
    // remove tag from the `exclude` list
    if (from === 'exclude') {
      if (!tags.exclude.includes(trimmedTag)) return;
      const newTags = { ...tags, exclude: tags.exclude.filter((t) => t !== trimmedTag) };
      setTags(newTags);
    }
  };

  const setTags = (tags) => {
    dispatch(updateRunnerTagsDetails({ collectionUid: collection.uid, tags }));
  };

  const setTagsEnabled = (tagsEnabled) => {
    dispatch(updateRunnerTagsDetails({ collectionUid: collection.uid, tagsEnabled }));
  };

  return (
    <div className="mt-6 flex flex-col">
      <div className="flex gap-2">
        <label className="block font-medium">Filter requests with tags</label>
        <input
          className="cursor-pointer"
          type="checkbox"
          checked={tagsEnabled}
          onChange={() => setTagsEnabled(!tagsEnabled)}
        />
      </div>
      {tagsEnabled && (
        <div className="flex flex-row mt-4 gap-4 w-full justify-between">
          <div className="w-1/2 flex flex-col gap-2">
            <span>Included tags:</span>
            <TagList
              tags={tags.include}
              handleAddTag={tag => handleAddTag({ tag, to: 'include' })}
              handleRemoveTag={tag => handleRemoveTag({ tag, from: 'include' })}
              tagsHintList={tagsHintList}
              handleValidation={handleValidation}
            />
          </div>
          <div className="w-1/2 flex flex-col gap-2">
            <span>Excluded tags:</span>
            <TagList
              tags={tags.exclude}
              handleAddTag={tag => handleAddTag({ tag, to: 'exclude' })}
              handleRemoveTag={tag => handleRemoveTag({ tag, from: 'exclude' })}
              tagsHintList={tagsHintList}
              handleValidation={handleValidation}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default RunnerTags;