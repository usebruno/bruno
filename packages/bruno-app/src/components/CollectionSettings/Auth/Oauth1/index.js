import React from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import OAuth1 from 'components/RequestPane/Auth/OAuth1';
import { updateCollectionAuth } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';

const CollectionOAuth1 = ({ collection }) => {
  const dispatch = useDispatch();
  const request = collection.draft?.root
    ? get(collection, 'draft.root.request', {})
    : get(collection, 'root.request', {});

  const save = () => dispatch(saveCollectionSettings(collection.uid));

  return (
    <OAuth1
      collection={collection}
      request={request}
      save={save}
      updateAuth={updateCollectionAuth}
    />
  );
};

export default CollectionOAuth1;
