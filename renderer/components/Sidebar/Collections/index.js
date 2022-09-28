import React from 'react';
import { useSelector } from 'react-redux';
import Collection from './Collection';

const Collections = () => {
  const collections = useSelector((state) => state.collections.collections);
  console.log(collections);

  return (
    <div className="mt-4 flex flex-col">
      {collections && collections.length ? collections.map((c) => {
        return <Collection
          collection={c}
          key={c.uid}
        />
      }) : null}
    </div>
  );
};

export default Collections;