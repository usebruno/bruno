import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconSearch,
  IconFolders,
  IconArrowsSort,
  IconSortAscendingLetters,
  IconSortDescendingLetters
} from '@tabler/icons-react';
import Collection from '../Collections/Collection';
import CreateCollection from '../CreateCollection';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { sortCollections } from 'providers/ReduxStore/slices/collections/actions';
import { ActionIcon, CloseButton, Input, Group, Tooltip, rem } from '@mantine/core';

// todo: move this to a separate folder
// the coding convention is to keep all the components in a folder named after the component
const CollectionsBadge = () => {
  const dispatch = useDispatch();
  const { collections } = useSelector((state) => state.collections);
  const { collectionSortOrder } = useSelector((state) => state.collections);

  const sortCollectionOrder = () => {
    let order;
    switch (collectionSortOrder) {
      case 'default':
        order = 'alphabetical';
        break;
      case 'alphabetical':
        order = 'reverseAlphabetical';
        break;
      case 'reverseAlphabetical':
        order = 'default';
        break;
    }
    dispatch(sortCollections({ order }));
  };

  return (
    <Tooltip label="Change collection sorting" openDelay={250}>
      <ActionIcon
        size={'input-xs'}
        variant={'default'}
        onClick={sortCollectionOrder}
        aria-label={'Change collection sorting'}
      >
        {collectionSortOrder == 'default' ? (
          <IconArrowsSort style={{ width: rem(16) }} strokeWidth={1.5} />
        ) : collectionSortOrder == 'alphabetical' ? (
          <IconSortAscendingLetters style={{ width: rem(16) }} strokeWidth={1.5} />
        ) : (
          <IconSortDescendingLetters style={{ width: rem(16) }} strokeWidth={1.5} />
        )}
      </ActionIcon>
    </Tooltip>
  );
};

const Collections = () => {
  const [searchText, setSearchText] = useState('');
  const { collections } = useSelector((state) => state.collections);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);

  if (!collections || !collections.length) {
    return (
      <StyledWrapper>
        <CreateOrOpenCollection />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      {createCollectionModalOpen ? <CreateCollection onClose={() => setCreateCollectionModalOpen(false)} /> : null}

      <Group mx={'xs'} gap={'xs'}>
        <Input
          value={searchText}
          placeholder={'Search for request'}
          onChange={(evt) => setSearchText(evt.currentTarget.value)}
          flex={1}
          size="xs"
          leftSection={<IconSearch style={{ width: rem(20) }} stroke={1.5} />}
          rightSectionPointerEvents="all"
          rightSection={
            <CloseButton
              aria-label="Clear search"
              onClick={() => setSearchText('')}
              style={{ display: searchText ? undefined : 'none' }}
            />
          }
        />

        <CollectionsBadge />
      </Group>

      <div className="flex flex-col overflow-y-auto absolute bottom-10 left-0 right-0" style={{ top: rem(90) }}>
        {collections && collections.length
          ? collections.map((c) => {
              return (
                <DndProvider backend={HTML5Backend} key={c.uid}>
                  <Collection searchText={searchText} collection={c} key={c.uid} />
                </DndProvider>
              );
            })
          : null}
      </div>
    </StyledWrapper>
  );
};

export default Collections;
