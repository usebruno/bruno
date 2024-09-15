import React from 'react';
import path from 'path';
import { useDispatch } from 'react-redux';
import { browseFiles } from 'providers/ReduxStore/slices/collections/actions';
import { IconX } from '@tabler/icons';
import { isWindowsOS } from 'utils/common/platform';
import slash from 'utils/common/slash';

const FilePickerEditor = ({ value, onChange, collection }) => {
  value = value || [];
  const dispatch = useDispatch();
  const filenames = value
    .filter((v) => v != null && v != '')
    .map((v) => {
      const separator = isWindowsOS() ? '\\' : '/';
      return v.split(separator).pop();
    });

  // title is shown when hovering over the button
  const title = filenames.map((v) => `- ${v}`).join('\n');

  const browse = () => {
    dispatch(browseFiles())
      .then((filePaths) => {
        // If file is in the collection's directory, then we use relative path
        // Otherwise, we use the absolute path
        filePaths = filePaths.map((filePath) => {
          const collectionDir = collection.pathname;

          if (filePath.startsWith(collectionDir)) {
            return path.relative(slash(collectionDir), slash(filePath));
          }

          return filePath;
        });

        onChange(filePaths);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const clear = () => {
    onChange([]);
  };

  const renderButtonText = (filenames) => {
    if (filenames.length == 1) {
      return filenames[0];
    }
    return filenames.length + ' files selected';
  };

  return filenames.length > 0 ? (
    <div
      className="btn btn-secondary px-1"
      style={{ fontWeight: 400, width: '100%', textOverflow: 'ellipsis', overflowX: 'hidden' }}
      title={title}
    >
      <button className="align-middle" onClick={clear}>
        <IconX size={18} />
      </button>
      &nbsp;
      {renderButtonText(filenames)}
    </div>
  ) : (
    <button className="btn btn-secondary px-1" style={{ width: '100%' }} onClick={browse}>
      Select Files
    </button>
  );
};

export default FilePickerEditor;
