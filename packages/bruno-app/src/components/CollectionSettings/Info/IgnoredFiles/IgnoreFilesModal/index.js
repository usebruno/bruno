import React, { useState, useEffect } from 'react';
import Modal from 'components/Modal';
import path from 'path';
import { IconTrash } from '@tabler/icons';
import { browseDirectoryOrFiles, updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import { collectionUnlinkFileEvent } from 'providers/ReduxStore/slices/collections';
import { useDispatch } from 'react-redux';
import { cloneDeep, forEach } from 'lodash';
import StyledWrapper from './StyleWrapper';

const IgnoreFilesModal = ({ onClose, collection }) => {
  const dispatch = useDispatch();
  const [ignoredFilesPaths, setIgnoredFilesPaths] = useState(collection.brunoConfig.ignore || []);
  const defaultIgnoredFiles = ['node_modules', '.git'];

  const getOnlyFileOrDirName = (filePath) => {
    return path.basename(filePath);
  };

  const browse = async () => {
    try {
      const filePaths = await dispatch(browseDirectoryOrFiles({ pathname: collection.pathname }));
      const uniqueIgnoredFiles = [...new Set([...ignoredFilesPaths, ...filePaths])];
      updateIgnoredFiles(uniqueIgnoredFiles);
    } catch (error) {
      console.error('Error browsing files:', error);
    }
  };

  const updateIgnoredFiles = async (newIgnoredFiles) => {
    const brunConfig = cloneDeep(collection.brunoConfig);
    brunConfig.ignore = newIgnoredFiles;

    setIgnoredFilesPaths(newIgnoredFiles);

    try {
      dispatch(updateBrunoConfig(brunConfig, collection.uid));
      triggerUnlinkFileEvents(newIgnoredFiles);
    } catch (error) {
      console.error('Error updating Bruno config:', error);
    }
  };

  const triggerUnlinkFileEvents = (filePaths) => {
    forEach(filePaths, (filePath) => {
      dispatch(
        collectionUnlinkFileEvent({
          file: {
            meta: {
              collectionUid: collection.uid,
              pathname: filePath
            }
          }
        })
      );
    });
  };

  const removeIgnoredFile = async (index) => {
    const newIgnoredFiles = [...ignoredFilesPaths];
    newIgnoredFiles.splice(index, 1);

    const brunConfig = cloneDeep(collection.brunoConfig);
    brunConfig.ignore = newIgnoredFiles;

    setIgnoredFilesPaths(newIgnoredFiles);

    try {
      await dispatch(updateBrunoConfig(brunConfig, collection.uid));
    } catch (error) {
      console.error('Error removing ignored file:', error);
    }
  };

  useEffect(() => {
    setIgnoredFilesPaths(collection.brunoConfig.ignore || []);
  }, [collection.brunoConfig.ignore]);

  return (
    <StyledWrapper>
      <Modal size="sm" title={'Ignored Paths'} handleCancel={onClose} hideFooter={true}>
        <div className="overflow-hidden">
          <table className="w-full border-collapse custom-table">
            <tbody className="overflow-y-auto max-h-64 hide-scrollbar">
              {ignoredFilesPaths.map((file, index) => (
                <tr key={index} className="flex justify-between items-center custom-row">
                  <td className="p-2 flex-1 custom-cell">
                    <span className="label">{getOnlyFileOrDirName(file)}</span>
                  </td>
                  <td className="p-2 custom-cell">
                    <button
                      className={`text-link select-none ${
                        defaultIgnoredFiles.includes(getOnlyFileOrDirName(file)) ? 'muted' : ''
                      }`}
                      title="Removing ignores require reopening the collection"
                      onClick={() => removeIgnoredFile(index)}
                      disabled={defaultIgnoredFiles.includes(getOnlyFileOrDirName(file))}
                    >
                      <IconTrash size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn-add-header text-link mt-2 select-none" onClick={browse}>
          + Add more files to ignore
        </button>
      </Modal>
    </StyledWrapper>
  );
};

export default IgnoreFilesModal;
