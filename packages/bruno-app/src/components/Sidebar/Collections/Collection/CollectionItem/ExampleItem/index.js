import React, { useState, useRef, forwardRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { addTab, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import { deleteResponseExample, updateResponseExample, addResponseExample } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { IconDots } from '@tabler/icons';
import { ExampleIcon } from 'components/Icons/examples';
import range from 'lodash/range';
import Dropdown from 'components/Dropdown';
import Modal from 'components/Modal';
import DeleteResponseExampleModal from './DeleteResponseExampleModal';
import StyledWrapper from './StyledWrapper';

const ExampleItem = ({ example, item, collection }) => {
  const dispatch = useDispatch();
  const [editName, setEditName] = useState(example.name);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const dropdownTippyRef = useRef(null);

  // Calculate indentation: item depth + 1 for examples
  const indents = range((item.depth || 0) + 1);

  const handleExampleClick = () => {
    dispatch(addTab({
      uid: example.uid, // Use example.uid as the tab uid
      exampleUid: example.uid,
      collectionUid: collection.uid,
      type: 'response-example',
      itemUid: item.uid
    }));
  };

  const handleDoubleClick = () => {
    dispatch(makeTabPermanent({ uid: example.uid }));
  };

  const handleRename = () => {
    setEditName(example.name); // Set current name when opening modal
    setShowRenameModal(true);
    if (dropdownTippyRef.current) {
      dropdownTippyRef.current.hide();
    }
  };

  // Update editName when example changes
  useEffect(() => {
    setEditName(example.name);
  }, [example.name]);

  const handleClone = () => {
    // Only pass response-related data - the reducer will automatically capture current request state
    const clonedExample = {
      name: `${example.name} (Copy)`,
      status: example.status,
      headers: example.headers,
      body: example.body,
      description: example.description
    };

    dispatch(addResponseExample({
      itemUid: item.uid,
      collectionUid: collection.uid,
      example: clonedExample
    }));
    dispatch(saveRequest(item.uid, collection.uid));

    if (dropdownTippyRef.current) {
      dropdownTippyRef.current.hide();
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
    if (dropdownTippyRef.current) {
      dropdownTippyRef.current.hide();
    }
  };

  const handleRenameConfirm = (newName) => {
    // Find the example index in the original examples array
    dispatch(updateResponseExample({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: example.uid,
      example: {
        name: newName
      }
    }));
    dispatch(saveRequest(item.uid, collection.uid));
    setShowRenameModal(false);
  };

  const onDropdownCreate = (instance) => {
    dropdownTippyRef.current = instance;
  };

  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} data-testid="response-example-menu-icon">
        <IconDots size={22} />
      </div>
    );
  });

  return (
    <StyledWrapper
      className="flex collection-item-name relative items-center"
      onClick={handleExampleClick}
      onDoubleClick={handleDoubleClick}
    >
      {indents && indents.length
        ? indents.map((i) => (
            <div
              className="indent-block"
              key={i}
              style={{ width: 16, minWidth: 16, height: '100%' }}
            >
              &nbsp;{/* Indent */}
            </div>
          ))
        : null}
      <div
        className="flex flex-grow items-center h-full overflow-hidden"
        style={{ paddingLeft: 8 }}
      >
        <ExampleIcon size={16} color="currentColor" className="mr-2 text-gray-400 flex-shrink-0" />
        <span className="item-name truncate text-gray-700 dark:text-gray-300 ">
          {example.name}
        </span>
      </div>
      <div className="menu-icon pr-2">
        <Dropdown onCreate={onDropdownCreate} icon={<MenuIcon />} placement="bottom-start">
          <div
            className="dropdown-item"
            onClick={(e) => {
              dropdownTippyRef.current.hide();
              handleRename();
            }}
            data-testid="response-example-rename-option"
          >
            Rename
          </div>
          <div
            className="dropdown-item"
            onClick={(e) => {
              dropdownTippyRef.current.hide();
              handleClone();
            }}
            data-testid="response-example-clone-option"
          >
            Clone
          </div>
          <div
            className="dropdown-item text-red-600"
            onClick={(e) => {
              dropdownTippyRef.current.hide();
              handleDelete();
            }}
            data-testid="response-example-delete-option"
          >
            Delete
          </div>
        </Dropdown>
      </div>

      {showRenameModal && (
        <Modal
          size="sm"
          title="Rename Example"
          handleCancel={() => {
            setShowRenameModal(false);
            setEditName(example.name); // Reset to original name on cancel
          }}
          handleConfirm={() => handleRenameConfirm(editName)}
          confirmText="Rename"
          cancelText="Cancel"
          confirmDisabled={!editName.trim()}
        >
          <div>
            <label htmlFor="renameExampleName" className="block font-semibold">
              Example Name
            </label>
            <input
              data-testid="rename-example-name-input"
              id="renameExampleName"
              type="text"
              className="textbox mt-2"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter example name..."
              autoFocus
              required
            />
          </div>
        </Modal>
      )}

      {showDeleteModal && (
        <DeleteResponseExampleModal
          onClose={() => setShowDeleteModal(false)}
          example={example}
          item={item}
          collection={collection}
        />
      )}
    </StyledWrapper>
  );
};

export default ExampleItem;
