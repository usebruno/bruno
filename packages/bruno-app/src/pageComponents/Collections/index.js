import React from 'react';
import { IconEdit, IconTrash } from "@tabler/icons";
import { useSelector } from 'react-redux';
import StyledWrapper from './StyledWrapper';


export default function Collections() {
  const collections = useSelector((state) => state.collections.collections);

  return (
    <StyledWrapper>
      <h4 className="heading">Collections</h4>

      <div className="collection-list mt-6">
        {collections && collections.length ? collections.map((collection) =>
          <div className="flex justify-between items-baseline mb-2 collection-list-item" key={collection.uid} >
            <li style={{listStyle: 'none'}} className="collection-name">{collection.name}</li>
            <div className="flex gap-x-4" >
              <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5}/>
              <IconTrash className="cursor-pointer" size={20} strokeWidth={1.5}/>
            </div>
          </div>
        ): null}
      </div>
    </StyledWrapper>
  );
};

