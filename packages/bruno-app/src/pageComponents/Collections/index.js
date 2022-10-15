import React from 'react';
import filter from "lodash/filter";
import { useSelector } from 'react-redux';
import CollectionItem from './CollectionItem';
import StyledWrapper from './StyledWrapper';
import { isLocalCollection } from 'utils/collections';

export default function Collections() {
  const collections = useSelector((state) => state.collections.collections);
  const collectionsToDisplay = filter(collections, (c) => !isLocalCollection(c));

  return (
    <StyledWrapper>
      <h4 className="heading">Collections</h4>

      <div className="collection-list mt-6">
        {(collectionsToDisplay && collectionsToDisplay.length) ? collectionsToDisplay.map((collection) => {
          return <CollectionItem key={collection.uid} collection={collection}/>;
        }): (
          <div>No collections found</div>
        )}
      </div>
    </StyledWrapper>
  );
};

