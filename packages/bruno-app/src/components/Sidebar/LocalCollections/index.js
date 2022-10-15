import React, { useRef, forwardRef } from 'react';
import filter from 'lodash/filter';
import { useSelector } from 'react-redux';
import Dropdown from 'components/Dropdown';
import { IconArrowForwardUp, IconCaretDown, IconFolders, IconPlus } from '@tabler/icons';
import Collection from '../Collections/Collection';
import { isLocalCollection } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const LocalCollections = ({searchText}) => {
  const dropdownTippyRef = useRef();
  const { collections } = useSelector((state) => state.collections);

  const collectionToDisplay = filter(collections, (c) => isLocalCollection(c));

  if(!collectionToDisplay || !collectionToDisplay.length) {
    return null;
  }

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="current-workspace flex justify-between items-center pl-2 pr-2 py-1 select-none">
        <div className='flex items-center'>
          <span className='mr-2'>
            <IconFolders size={18} strokeWidth={1.5}/>
          </span>
          <span>
            Local Collections
          </span>
        </div>
        <IconCaretDown className="caret" size={14} strokeWidth={2}/>
      </div>
    );
  });

  const onDropdownCreate = (ref) => dropdownTippyRef.current = ref;

  return (
    <StyledWrapper>
      <div className="items-center cursor-pointer mt-6 relative">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement='bottom-end'>
          <div className="dropdown-item" onClick={() => {}}>
            <div className="pr-2 text-gray-600">
              <IconPlus size={18} strokeWidth={1.5}/>
            </div>
            <span>Create Collection</span>
          </div>
          <div className="dropdown-item" onClick={() => {}}>
            <div className="pr-2 text-gray-600">
              <IconArrowForwardUp size={18} strokeWidth={1.5}/>
            </div>
            <span>Open Collection</span>
          </div>

          <div className='px-2 pt-2 text-gray-600' style={{fontSize: 10, borderTop: 'solid 1px #e7e7e7'}}>
            Note: Local collections are not tied to a workspace
          </div>
        </Dropdown>
      </div>
      <div className="mt-4 flex flex-col">
        {collectionToDisplay && collectionToDisplay.length ? collectionToDisplay.map((c) => {
          return <Collection
            searchText={searchText}
            collection={c}
            key={c.uid}
          />
        }) : null}
      </div>
    </StyledWrapper>
  );
};

export default LocalCollections;
