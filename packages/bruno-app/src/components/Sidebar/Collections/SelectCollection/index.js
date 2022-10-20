import React from 'react';
import filter from 'lodash/filter';
import Modal from 'components/Modal/index';
import { IconFiles } from '@tabler/icons';
import { useSelector } from 'react-redux';
import { isLocalCollection } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const SelectCollection = ({ onClose, onSelect, title }) => {
  const { collections } = useSelector((state) => state.collections);
  const collectionsToDisplay = filter(collections, (c) => !isLocalCollection(c));

  return (
    <StyledWrapper>
      <Modal size="sm" title={title || 'Select Collection'} hideFooter={true} handleCancel={onClose}>
        <ul className="mb-2">
          {collectionsToDisplay && collectionsToDisplay.length ? (
            collectionsToDisplay.map((c) => (
              <div className="collection" key={c.uid} onClick={() => onSelect(c.uid)}>
                <IconFiles size={18} strokeWidth={1.5} /> <span className="ml-2">{c.name}</span>
              </div>
            ))
          ) : (
            <div>No collections found</div>
          )}
        </ul>
      </Modal>
    </StyledWrapper>
  );
};

export default SelectCollection;
