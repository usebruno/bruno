import React from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { IconFolder, IconFolderOff, IconEye } from '@tabler/icons';
import { getBasename } from 'utils/common/path';
import { unignoreFolder } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const DEFAULT_IGNORES = ['node_modules', '.git'];

const Ignore = ({ collection }) => {
  const dispatch = useDispatch();

  const ignore = get(collection, 'brunoConfig.ignore', []);
  const ignoredFolders = ignore.filter((entry) => !DEFAULT_IGNORES.includes(entry));

  const handleUnignore = (relativePath) => {
    dispatch(unignoreFolder(relativePath, collection.uid))
      .then(() => toast.success('Folder unignored'))
      .catch((error) => {
        console.error(error);
        toast.error('Failed to unignore folder');
      });
  };

  return (
    <StyledWrapper className="h-full w-full">
      <div className="mb-3">
        <label className="flex items-center">
          Ignored Folders (
          {ignoredFolders.length}
          )
        </label>
        <p className="hint text-xs mt-1">
          Ignored folders are excluded from the collection. Right-click a folder in the sidebar and choose Ignore to add one here.
        </p>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th>Folder</th>
            <th>Path</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {ignoredFolders.length === 0 ? (
            <tr>
              <td colSpan="3" className="text-center">
                <div className="empty-state flex flex-col items-center py-4">
                  <IconFolderOff size={24} className="empty-icon mb-2" />
                  <span className="empty-text">No ignored folders</span>
                </div>
              </td>
            </tr>
          ) : (
            ignoredFolders.map((relativePath, index) => (
              <tr key={index}>
                <td>
                  <div className="flex items-center">
                    <IconFolder size={16} className="folder-icon mr-2" />
                    <span className="folder-name">{getBasename(collection.pathname, relativePath)}</span>
                  </div>
                </td>
                <td>
                  <div className="path-text">{relativePath}</div>
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => handleUnignore(relativePath)}
                    className="action-button"
                    title="Unignore folder"
                  >
                    <IconEye size={14} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </StyledWrapper>
  );
};

export default Ignore;
