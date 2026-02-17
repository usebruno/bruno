import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addTab, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import {
  updateResponseExample,
  cloneResponseExample
} from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { insertTaskIntoQueue } from 'providers/ReduxStore/slices/app';
import { uuid } from 'utils/common';
import { IconDots, IconEdit, IconCopy, IconTrash, IconCode } from '@tabler/icons';
import ExampleIcon from 'components/Icons/ExampleIcon';
import range from 'lodash/range';
import classnames from 'classnames';
import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
import Modal from 'components/Modal';
import DeleteResponseExampleModal from './DeleteResponseExampleModal';
import GenerateCodeItem from '../GenerateCodeItem';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';

const ExampleItem = ({ example, item, collection }) => {
  const { dropdownContainerRef } = useSidebarAccordion();
  const dispatch = useDispatch();
  // Check if this example is the active tab
  const activeTabUid = useSelector((state) => state.tabs?.activeTabUid);
  const isExampleActive = activeTabUid === example.uid;
  const [editName, setEditName] = useState(example.name || '');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [generateCodeItemModalOpen, setGenerateCodeItemModalOpen] = useState(false);
  const exampleRef = useRef(null);
  const menuDropdownRef = useRef(null);

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
  };

  // Update editName when example changes
  useEffect(() => {
    setEditName(example.name);
  }, [example.name]);

  useEffect(() => {
    if (isExampleActive && exampleRef.current) {
      try {
        exampleRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (err) {
        // ignore scroll errors
      }
    }
  }, [isExampleActive]);

  const handleClone = async () => {
    // Calculate the index where the cloned example will be saved
    // It will be at the end of the examples array
    const existingExamples = item.draft?.examples || item.examples || [];
    const clonedExampleIndex = existingExamples.length;
    const clonedExampleUid = uuid();

    dispatch(cloneResponseExample({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: example.uid,
      clonedUid: clonedExampleUid
    }));

    // Save the request
    await dispatch(saveRequest(item.uid, collection.uid, true));

    // Task middleware will track this and open the example in a new tab once the file is reloaded
    dispatch(insertTaskIntoQueue({
      uid: clonedExampleUid,
      type: 'OPEN_EXAMPLE',
      collectionUid: collection.uid,
      itemUid: item.uid,
      exampleIndex: clonedExampleIndex
    }));
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleGenerateCode = () => {
    // Check if example has a request URL
    if (
      (example?.request?.url !== '' && example?.request?.url !== undefined)
      || (item?.request?.url !== '' && item?.request?.url !== undefined)
      || (item?.draft?.request?.url !== undefined && item?.draft?.request?.url !== '')
    ) {
      setGenerateCodeItemModalOpen(true);
    } else {
      toast.error('URL is required');
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
    dispatch(saveRequest(item.uid, collection.uid, true))
      .then(() => {
        toast.success(`Example renamed to "${newName}"`);
        setShowRenameModal(false);
      });
  };

  // Build menu items for MenuDropdown
  const buildMenuItems = () => {
    return [
      {
        id: 'rename',
        leftSection: IconEdit,
        label: 'Rename',
        onClick: handleRename,
        testId: 'response-example-rename-option'
      },
      {
        id: 'clone',
        leftSection: IconCopy,
        label: 'Clone',
        onClick: handleClone,
        testId: 'response-example-clone-option'
      },
      {
        id: 'generate-code',
        leftSection: IconCode,
        label: 'Generate Code',
        onClick: handleGenerateCode,
        testId: 'response-example-generate-code-option'
      },
      { id: 'separator-1', type: 'divider' },
      {
        id: 'delete',
        leftSection: IconTrash,
        label: 'Delete',
        className: 'delete-item',
        onClick: handleDelete,
        testId: 'response-example-delete-option'
      }
    ];
  };

  // Handle right-click context menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    menuDropdownRef.current?.show();
  };

  const itemRowClassName = classnames('flex collection-item-name relative items-center', {
    'item-focused-in-tab': isExampleActive
  });

  return (
    <StyledWrapper
      ref={exampleRef}
      className={itemRowClassName}
      onClick={handleExampleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
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
        <div style={{ width: 16, minWidth: 16 }}></div>
        <ExampleIcon size={16} color="currentColor" className="example-icon mr-1 flex-shrink-0" />
        <span className="item-name truncate">{example.name}</span>
      </div>
      <div className="menu-icon pr-2">
        <MenuDropdown
          ref={menuDropdownRef}
          items={buildMenuItems()}
          placement="bottom-start"
          appendTo={dropdownContainerRef?.current || document.body}
          popperOptions={{ strategy: 'fixed' }}
          data-testid="response-example-menu"
        >
          <IconDots size={22} data-testid="response-example-menu-icon" />
        </MenuDropdown>
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
          confirmDisabled={!editName || !editName.trim()}
        >
          <div>
            <label htmlFor="renameExampleName" className="block font-medium">
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

      {generateCodeItemModalOpen && (
        <GenerateCodeItem
          collectionUid={collection.uid}
          item={item}
          onClose={() => setGenerateCodeItemModalOpen(false)}
          isExample={true}
          exampleUid={example.uid}
        />
      )}
    </StyledWrapper>
  );
};

export default ExampleItem;
