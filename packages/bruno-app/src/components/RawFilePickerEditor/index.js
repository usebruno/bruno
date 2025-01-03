import React from 'react';
import path from 'path';
import { useDispatch } from 'react-redux';
import { browseFile } from 'providers/ReduxStore/slices/collections/actions';
import { IconX } from '@tabler/icons';
import { isWindowsOS } from 'utils/common/platform';
import slash from 'utils/common/slash';

const RawFilePickerEditor = ({ value, onChange, collection }) => {
  value = value || '';
  const dispatch = useDispatch();
  const separator = isWindowsOS() ? '\\' : '/';
  const filename = value != '' ? value.split(separator).pop() : value;
  const title = `- ${filename}`;

  const browse = () => {
    dispatch(browseFile())
      .then((filePath) => {
        const collectionDir = collection.pathname;

        if (typeof filePath === 'string') {
          filePath = filePath.startsWith(collectionDir)
            ? path.relative(slash(collectionDir), slash(filePath))
            : filePath;

          onChange(filePath);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const clear = () => {
    onChange(null);
  };

  return filename.length > 0 ? (
    <div className="btn btn-secondary px-1 font-normal w-full text-ellipsis overflow-x-hidden" title={title}>
      <button className="align-middle" onClick={clear}>
        <IconX size={18} />
      </button>
      &nbsp;
      {filename}
    </div>
  ) : (
    <button className="btn btn-secondary px-1 w-full" onClick={browse}>
      Select File
    </button>
  );
};

export default RawFilePickerEditor;
