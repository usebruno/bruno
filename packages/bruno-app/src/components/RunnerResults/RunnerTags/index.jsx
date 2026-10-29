import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateRunnerTagsDetails } from 'providers/ReduxStore/slices/collections';
import { getUniqueTagsFromItems } from 'utils/collections';
import IncludeExcludeTags from 'components/IncludeExcludeTags';
import { selectCollectionByUid } from 'src/selectors/collections';

const RunnerTags = ({ collectionUid, className = '' }) => {
  const dispatch = useDispatch();
  const collection = useSelector((state) => selectCollectionByUid(state, collectionUid));
  const items = collection?.items;

  const availableTags = useMemo(() => getUniqueTagsFromItems(items || []), [items]);

  const handleChange = (newTags) => {
    dispatch(updateRunnerTagsDetails({ collectionUid, tags: newTags }));
  };

  return (
    <IncludeExcludeTags
      dataTestId="runner-tags"
      className={className}
      tags={collection?.runnerTags}
      availableTags={availableTags}
      onChange={handleChange}
    />
  );
};

export default RunnerTags;
