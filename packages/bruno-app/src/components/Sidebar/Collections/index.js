import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import find from 'lodash/find';
import filter from 'lodash/filter';
import Collection from './Collection';
import CreateOrAddCollection from './CreateOrAddCollection';

const Collections = ({searchText}) => {
  const { collections } = useSelector((state) => state.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const activeWorkspace = find(workspaces, w => w.uid === activeWorkspaceUid);

  if(!activeWorkspace) {
    return null;
  }

  const { collectionUids } = activeWorkspace;
  const collectionToDisplay = filter(collections, (c) => collectionUids.includes(c.uid));

  if(!collectionToDisplay || !collectionToDisplay.length) {
    return <CreateOrAddCollection />;
  }

  return (
    <div className="mt-4 flex flex-col">
      {collectionToDisplay && collectionToDisplay.length ? collectionToDisplay.map((c) => {
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