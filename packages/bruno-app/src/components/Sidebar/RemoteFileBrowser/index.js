import React, { useState, useEffect } from 'react';
import Modal from 'components/Modal';
import toast from 'react-hot-toast';
import { IconFolder, IconFile, IconChevronRight, IconChevronDown, IconCloud } from '@tabler/icons';

const { ipcRenderer } = window;

const RemoteFileBrowser = ({ isOpen, onClose, connectionId, onSelectCollection }) => {
  const [currentPath, setCurrentPath] = useState('.');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [pathHistory, setPathHistory] = useState(['.']);

  useEffect(() => {
    if (isOpen && connectionId) {
      loadDirectory(currentPath);
    }
  }, [isOpen, connectionId, currentPath]);

  const loadDirectory = async (path) => {
    setLoading(true);
    try {
      const result = await ipcRenderer.invoke('renderer:ssh-list-directory', connectionId, path);

      if (result.success) {
        setItems(result.items);
      } else {
        toast.error(`Failed to load directory: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Failed to load directory: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item) => {
    if (item.type === 'directory') {
      setCurrentPath(item.path);
      setPathHistory([...pathHistory, item.path]);
      setSelectedItem(null);
    } else {
      setSelectedItem(item);
    }
  };

  const handleItemDoubleClick = (item) => {
    if (item.type === 'directory' && item.isCollection) {
      setSelectedItem(item);
    }
  };

  const handleBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      newHistory.pop();
      const previousPath = newHistory[newHistory.length - 1];
      setCurrentPath(previousPath);
      setPathHistory(newHistory);
    }
  };

  const handleOpenCollection = async () => {
    let collectionPath = null;
    let collectionUid = null;

    if (selectedItem?.isCollection) {
      collectionPath = selectedItem.path;
    } else if (selectedItem?.name === 'bruno.json' || selectedItem?.name === 'collection.yml') {
      collectionPath = currentPath;
    }

    if (!collectionPath) {
      toast.error('Please select a Bruno collection (directory or bruno.json)');
      return;
    }

    try {
      collectionUid = `remote-${Date.now()}`;
      const result = await ipcRenderer.invoke('renderer:ssh-open-collection',
        connectionId,
        collectionPath,
        collectionUid);

      if (result.success) {
        toast.success('Collection opened successfully');
        onSelectCollection(result);
        onClose();
      } else {
        toast.error(`Failed to open collection: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Failed to open collection: ${error.message}`);
    }
  };

  return (
    <Modal
      size="lg"
      title="Browse Remote Collections"
      confirmText="Open Collection"
      cancelText="Cancel"
      handleConfirm={handleOpenCollection}
      handleCancel={onClose}
      disableConfirm={!selectedItem || (!selectedItem.isCollection && selectedItem.name !== 'bruno.json' && selectedItem.name !== 'collection.yml')}
    >
      <div className="flex flex-col h-96">
        {/* Path breadcrumb */}
        <div className="flex items-center gap-2 mb-4 p-2 bg-gray-100 rounded">
          <button
            onClick={handleBack}
            disabled={pathHistory.length <= 1}
            className="px-2 py-1 text-sm bg-white border rounded disabled:opacity-50"
          >
            Back
          </button>
          <span className="text-sm font-mono">{currentPath}</span>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-auto border rounded">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span>Loading...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Empty directory
            </div>
          ) : (
            <div className="divide-y">
              {pathHistory.length > 1 && (
                <div
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100"
                  onClick={handleBack}
                >
                  <IconFolder size={18} className="text-yellow-600" />
                  <span className="flex-1">..</span>
                </div>
              )}
              {items.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 ${selectedItem?.path === item.path ? 'bg-blue-100' : ''
                  }`}
                  onClick={() => handleItemClick(item)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                >
                  {item.type === 'directory' ? (
                    <IconFolder size={18} className="text-yellow-600" />
                  ) : (
                    <IconFile size={18} className="text-gray-600" />
                  )}

                  <span className="flex-1">{item.name}</span>

                  {item.isCollection && (
                    <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      <IconCloud size={14} />
                      Collection
                    </span>
                  )}

                  {item.type === 'directory' && (
                    <IconChevronRight size={16} className="text-gray-400" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected item info */}
        {selectedItem && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <div className="text-sm">
              <strong>Selected:</strong> {selectedItem.name}
            </div>
            {selectedItem.isCollection && (
              <div className="text-xs text-green-600 mt-1">
                ✓ This is a Bruno collection
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RemoteFileBrowser;
