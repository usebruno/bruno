import React from 'react';
import { useStore } from 'providers/Store';
import Collection from './Collection';

const Collections = () => {
  const [store, storeDispatch] = useStore();
  const {
    collections
  } = store;

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