import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Collection from './Collection';

const Collections = ({searchText}) => {
  const collections = useSelector((state) => state.collections.collections);

  return (
    <div className="mt-4 flex flex-col">
      {collections && collections.length ? collections.map((c) => {
        return <Collection
          searchText={searchText}
          collection={c}
          key={c.uid}
        />
      }) : null}
    </div>
  );
};

export default Collections;