import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import classnames from 'classnames';
import { IconCopy, IconDots, IconPencil, IconServer2, IconTrash } from '@tabler/icons';
import toast from 'react-hot-toast';
import { deleteMockResponse, saveMockResponse } from 'providers/ReduxStore/slices/mock-server';
import { addTab, closeTabs, updateTabMeta } from 'providers/ReduxStore/slices/tabs';
import { removeMockResponseEditor, syncMockResponseEditorSaved } from 'providers/ReduxStore/slices/collections/mockResponseEditorActions';
import { cloneMockResponseRecord } from 'utils/mock-responses';
import DeleteMockResponseModal from 'components/MockResponse/DeleteMockResponseModal';
import RenameMockResponseModal from 'components/MockResponse/RenameMockResponseModal';
import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';

const MockResponseSidebarItem = ({
  response,
  instance,
  collectionUid,
  location
}) => {
  const dispatch = useDispatch();
  const activeTabUid = useSelector((state) => state.tabs?.activeTabUid);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const openResponseTab = (nextResponse) => {
    dispatch(addTab({
      uid: nextResponse.uid,
      type: 'mock-response',
      mockServerUid: instance.uid,
      collectionUid,
      responseName: nextResponse.name,
      tabName: nextResponse.name,
      preview: false
    }));
  };

  const handleRenameConfirm = async (name) => {
    setIsRenaming(true);
    try {
      const nextResponse = {
        ...response,
        name
      };

      await dispatch(saveMockResponse({
        ...location,
        response: nextResponse
      })).unwrap();

      dispatch(updateTabMeta({
        uid: response.uid,
        tabName: name,
        responseName: name
      }));
      dispatch(syncMockResponseEditorSaved({
        responseUid: response.uid,
        mockResponse: nextResponse
      }));

      setShowRenameModal(false);
      toast.success('Mock response renamed');
    } catch (err) {
      toast.error(err.message || 'Failed to rename mock response');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleClone = async () => {
    if (isCloning) {
      return;
    }

    setIsCloning(true);
    try {
      const clonedResponse = cloneMockResponseRecord(response);
      const result = await dispatch(saveMockResponse({
        ...location,
        response: clonedResponse
      })).unwrap();

      openResponseTab(result.response || clonedResponse);
      toast.success('Mock response cloned');
    } catch (err) {
      toast.error(err.message || 'Failed to clone mock response');
    } finally {
      setIsCloning(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await dispatch(deleteMockResponse({
        ...location,
        responseUid: response.uid
      })).unwrap();

      dispatch(closeTabs({ tabUids: [response.uid] }));
      dispatch(removeMockResponseEditor({ responseUid: response.uid }));
      setShowDeleteModal(false);
      toast.success('Mock response deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete mock response');
    } finally {
      setIsDeleting(false);
    }
  };

  const menuItems = [
    {
      id: 'rename',
      leftSection: IconPencil,
      label: 'Rename',
      testId: `mock-response-sidebar-rename-${response.uid}`,
      onClick: () => setShowRenameModal(true)
    },
    {
      id: 'clone',
      leftSection: IconCopy,
      label: isCloning ? 'Cloning...' : 'Clone',
      disabled: isCloning,
      testId: `mock-response-sidebar-clone-${response.uid}`,
      onClick: handleClone
    },
    {
      id: 'delete',
      leftSection: IconTrash,
      label: 'Delete',
      className: 'delete-item',
      testId: `mock-response-sidebar-delete-${response.uid}`,
      onClick: () => setShowDeleteModal(true)
    }
  ];

  return (
    <>
      {showRenameModal ? (
        <RenameMockResponseModal
          response={response}
          isSaving={isRenaming}
          onClose={() => {
            if (!isRenaming) {
              setShowRenameModal(false);
            }
          }}
          onConfirm={handleRenameConfirm}
        />
      ) : null}

      {showDeleteModal ? (
        <DeleteMockResponseModal
          response={response}
          isDeleting={isDeleting}
          onClose={() => {
            if (!isDeleting) {
              setShowDeleteModal(false);
            }
          }}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}

      <div
        className="flex items-center w-full pr-1"
        data-testid={`mock-response-sidebar-item-${response.uid}`}
      >
        <button
          type="button"
          className={classnames(
            'flex-1 min-w-0 text-left py-1 pl-0 pr-1 text-xs hover:opacity-100 opacity-80 flex items-center gap-2',
            { 'font-medium': activeTabUid === response.uid }
          )}
          onClick={() => openResponseTab(response)}
        >
          <IconServer2 size={12} stroke={1.5} className="flex-shrink-0 opacity-80" aria-hidden="true" />
          <span className="truncate">{response.name}</span>
        </button>
        <MenuDropdown items={menuItems} placement="bottom-end">
          <ActionIcon label="Mock response actions" className="flex-shrink-0">
            <IconDots size={12} stroke={1.5} aria-hidden="true" />
          </ActionIcon>
        </MenuDropdown>
      </div>
    </>
  );
};

export default MockResponseSidebarItem;
