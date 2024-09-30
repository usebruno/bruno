import React, { useState } from 'react';
import { browseDirectoryOrFiles, updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import path from 'path';
import slash from 'utils/common/slash';
import { IconX } from '@tabler/icons';
import { cloneDeep, remove } from 'lodash';

const IgnoredFiles = ({ ignoredFiles, collection }) => {
  const dispatch = useDispatch();
  const [ignoredFilesPaths, setIgnoredFilesPaths] = useState(ignoredFiles);

  function browse() {
    dispatch(browseDirectoryOrFiles({ pathname: collection.pathname }))
      .then((filePaths) => {
        filePaths = filePaths.map((filePath) => {
          const collectionDir = collection.pathname;

          if (filePath.startsWith(collectionDir)) {
            return path.relative(slash(collectionDir), slash(filePath));
          }

          return filePath;
        });

        const newIgnoredFiles = [...ignoredFilesPaths, ...filePaths];
        const uniqueIgnoredFiles = [...new Set(newIgnoredFiles)];

        const brunConfig = cloneDeep(collection.brunoConfig);
        brunConfig.ignore = uniqueIgnoredFiles;

        setIgnoredFilesPaths(uniqueIgnoredFiles);

        dispatch(updateBrunoConfig(brunConfig, collection.uid));
      })
      .catch((error) => {
        console.error(error);
      });
  }

  const getOnlyFileorDirName = (filePath) => {
    const separator = path.sep;
    return filePath.split(separator).pop();
  };

  const removeIgnoredFile = (index) => {
    const newIgnoredFiles = [...ignoredFilesPaths];
    remove(newIgnoredFiles, (file, i) => i === index);

    const brunConfig = cloneDeep(collection.brunoConfig);
    brunConfig.ignore = newIgnoredFiles;

    setIgnoredFilesPaths(newIgnoredFiles);

    dispatch(updateBrunoConfig(brunConfig, collection.uid));
  }

  return (
    <tr>
      <td className="p-2 text-right">Ignored Files&nbsp;:</td>
      <td className="p-2">
        <div className="flex gap-2">
          <div className="flex gap-2" style={{ maxWidth: '100%', whiteSpace: 'nowrap' }}>
            {ignoredFilesPaths.map((file, index) => (
              <span className="border p-1 rounded border-slate-600" key={index} style={{ textOverflow: 'ellipsis' }}>
                {getOnlyFileorDirName(file)}
                &nbsp;
                <button 
                onClick={() => removeIgnoredFile(index)}
                className="align-middle">
                  <IconX size={18} />
                </button>
              </span>
            ))}
          </div>
          <button className="text-link select-none" onClick={browse}>
            + Add
          </button>
        </div>
      </td>
    </tr>
  );
};

export default IgnoredFiles;
