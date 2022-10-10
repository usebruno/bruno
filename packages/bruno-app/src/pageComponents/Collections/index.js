import React from 'react';
import { useSelector } from 'react-redux';
import CollectionItem from './CollectionItem';
import StyledWrapper from './StyledWrapper';

export default function Collections() {
  const collections = useSelector((state) => state.collections.collections);

  return (
    <StyledWrapper>
      <h4 className="heading">Collections</h4>

      <div className="collection-list mt-6">
        {collections && collections.length ? collections.map((collection) => {
          return <CollectionItem key={collection.uid} collection={collection}/>;
        }): null}
      </div>
    </StyledWrapper>
  );
};

