import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { find } from 'lodash';
import { updateRunnerTagsDetails } from 'providers/ReduxStore/slices/collections';
import { getUniqueTagsFromItems } from 'utils/collections';
import IncludeExcludeTags from 'components/IncludeExcludeTags';

const EMPTY_TAGS = { include: [], exclude: [] };

const RunnerTags = ({ collectionUid, className = '' }) => {
  const dispatch = useDispatch();
  const collection = useSelector((state) => find(state.collections.collections, (c) => c.uid === collectionUid));
  const items = collection?.items;
  const tags = collection?.runnerTags || EMPTY_TAGS;

  const availableTags = useMemo(() => getUniqueTagsFromItems(items || []), [items]);

  const handleChange = (newTags) => {
    dispatch(updateRunnerTagsDetails({ collectionUid, tags: newTags }));
  };

  return (
    <IncludeExcludeTags
      testIdPrefix="runner"
      className={className}
      tags={tags}
      availableTags={availableTags}
      onChange={handleChange}
    />
  );
};

export default RunnerTags;
