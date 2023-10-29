import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Collection from '../Collections/Collection';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const Collections = () => {
  const { collections } = useSelector((state) => state.collections);

  if (!collections || !collections.length) {
    return (
      <StyledWrapper>
        <CreateOrOpenCollection />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <div className="flex flex-col relative overflow-y-auto  bottom-0 left-0 right-0">
        {collections && collections.length
          ? collections.map((c) => {
              return (
                <DndProvider backend={HTML5Backend} key={c.uid}>
                  <Collection collection={c} key={c.uid} />
                </DndProvider>
              );
            })
          : null}
      </div>
    </StyledWrapper>
  );
};

export default Collections;
