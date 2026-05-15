import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { get, cloneDeep, find } from 'lodash';
import { useTranslation } from 'react-i18next';
import { updateCollectionTagsList, updateRunnerTagsDetails } from 'providers/ReduxStore/slices/collections';
import TagList from 'components/TagList';

const RunnerTags = ({ collectionUid, className = '' }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const collections = useSelector((state) => state.collections.collections);
  const collection = cloneDeep(find(collections, (c) => c.uid === collectionUid));

  const tags = get(collection, 'runnerTags', { include: [], exclude: [] });
  const availableTags = get(collection, 'allTags', []);
  const tagsHintList = availableTags.filter((t) => !tags.exclude.includes(t) && !tags.include.includes(t));

  useEffect(() => {
    dispatch(updateCollectionTagsList({ collectionUid }));
  }, [collection.uid, dispatch]);

  const handleValidation = (tag) => {
    const trimmedTag = tag.trim();
    if (!availableTags.includes(trimmedTag)) {
      return t('RUNNER_RESULTS.TAG_DOES_NOT_EXIST');
    }
    if (tags.include.includes(trimmedTag)) {
      return t('RUNNER_RESULTS.TAG_ALREADY_IN_INCLUDE');
    }
    if (tags.exclude.includes(trimmedTag)) {
      return t('RUNNER_RESULTS.TAG_IN_EXCLUDE');
    }
  };

  const handleAddTag = ({ tag, to }) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    if (to === 'include') {
      if (tags.include.includes(trimmedTag) || tags.exclude.includes(trimmedTag)) return;
      if (!availableTags.includes(trimmedTag)) return;
      const newTags = { ...tags, include: [...tags.include, trimmedTag].sort() };
      setTags(newTags);
      return;
    }
    // add tag to the `exclude` list
    if (to === 'exclude') {
      if (tags.include.includes(trimmedTag) || tags.exclude.includes(trimmedTag)) return;
      if (!availableTags.includes(trimmedTag)) return;
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

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex flex-row gap-4 w-full">
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <span>{t('RUNNER_RESULTS.INCLUDE_TAGS')}</span>
          <TagList
            tags={tags.include}
            handleAddTag={(tag) => handleAddTag({ tag, to: 'include' })}
            handleRemoveTag={(tag) => handleRemoveTag({ tag, from: 'include' })}
            tagsHintList={tagsHintList}
            handleValidation={handleValidation}
          />
        </div>
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <span>{t('RUNNER_RESULTS.EXCLUDE_TAGS')}</span>
          <TagList
            tags={tags.exclude}
            handleAddTag={(tag) => handleAddTag({ tag, to: 'exclude' })}
            handleRemoveTag={(tag) => handleRemoveTag({ tag, from: 'exclude' })}
            tagsHintList={tagsHintList}
            handleValidation={handleValidation}
          />
        </div>
      </div>
    </div>
  );
};

export default RunnerTags;
