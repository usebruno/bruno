import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import path from 'path';
import { browseDirectoryOrFiles, updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import { collectionUnlinkFileEvent } from 'providers/ReduxStore/slices/collections/index';
import slash from 'utils/common/slash';
import { IconX } from '@tabler/icons';
import { cloneDeep, forEach, remove } from 'lodash';

const IgnoredFiles = ({ ignoredFiles, collection }) => {
  const dispatch = useDispatch();
  const [ignoredFilesPaths, setIgnoredFilesPaths] = useState(ignoredFiles);

  console.log('Collection settings -> Ignored Files:', ignoredFilesPaths);

  const browse = async () => {
    try {
      const filePaths = await dispatch(browseDirectoryOrFiles({ pathname: collection.pathname }));
      // const relativeFilePaths = filePaths.map((filePath) => getRelativeFilePath(filePath, collection.pathname));
      const uniqueIgnoredFiles =  [...new Set([...ignoredFilesPaths, ...filePaths])]
      updateIgnoredFiles(uniqueIgnoredFiles);
    } catch (error) {
      console.error('Error browsing files:', error);
    }
  };

  // const getRelativeFilePath = (filePath, collectionDir) => {
  //   return filePath.startsWith(collectionDir) ? path.relative(slash(collectionDir), slash(filePath)) : filePath;
  // };

  const updateIgnoredFiles = async (newIgnoredFiles) => {
    const brunConfig = cloneDeep(collection.brunoConfig);
    brunConfig.ignore = newIgnoredFiles;

    setIgnoredFilesPaths(newIgnoredFiles);
    
    try {
       dispatch(updateBrunoConfig(brunConfig, collection.uid));
      console.log('Ignored files updated successfully');
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

  const getOnlyFileOrDirName = (filePath) => {
    return filePath.split(path.sep).pop();
  };

  const removeIgnoredFile = async (index) => {
    const newIgnoredFiles = [...ignoredFilesPaths];
    remove(newIgnoredFiles, (file, i) => i === index);

    const brunConfig = cloneDeep(collection.brunoConfig);
    brunConfig.ignore = newIgnoredFiles;

    setIgnoredFilesPaths(newIgnoredFiles);

    try {
      dispatch(updateBrunoConfig(brunConfig, collection.uid));
      console.log('Ignored file removed successfully');
    } catch (error) {
      console.error('Error removing ignored file:', error);
    }
  };

  return (
    <tr>
      <td className="p-2 text-right">Ignored Files&nbsp;:</td>
      <td className="p-2">
        <div className="flex gap-2">
          <div className="flex gap-2" style={{ maxWidth: '100%', whiteSpace: 'nowrap' }}>
            {ignoredFilesPaths.map((file, index) => (
              <span className="border p-1 rounded border-slate-600" key={index} style={{ textOverflow: 'ellipsis' }}>
                {getOnlyFileOrDirName(file)}
                &nbsp;
                <button onClick={() => removeIgnoredFile(index)} className="align-middle">
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
