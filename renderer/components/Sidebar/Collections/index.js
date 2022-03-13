import React from 'react';
import Collection from './Collection';

const Collections = ({collections, actions, dispatch, activeRequestTabId}) => {
  return (
    <div className="mt-4 flex flex-col">
      {collections && collections.length ? collections.map((c) => {
        return <Collection
          collection={c}
          key={c.uid}
          actions={actions}
          dispatch={dispatch}
          activeRequestTabId={activeRequestTabId}
        />
      }) : null}
    </div>
  );
};

export default Collections;