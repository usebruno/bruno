import React, { useState, useEffect } from 'react';
import path from 'path';
import IgnoreFilesModal from './IgnoreFilesModal';
import { IconSettings } from '@tabler/icons';
import StyledWrapper from '../StyledWrapper';

const IgnoredFiles = ({ collection }) => {
  const [ignoredFilesPaths, setIgnoredFilesPaths] = useState(collection.brunoConfig.ignore || []);
  const [showModal, setShowModal] = useState(false);

  const defaultIgnoredFiles = ['node_modules', '.git'];

  const getOnlyFileOrDirName = (filePath) => {
    return path.basename(filePath);
  };

  const handleManageIconClick = () => {
    setShowModal(true);
  };

  useEffect(() => {
    setIgnoredFilesPaths(collection.brunoConfig.ignore || []);
  }, [collection.brunoConfig.ignore]);

  const filteredIgnoredFiles = ignoredFilesPaths.filter(
    (file) => !defaultIgnoredFiles.includes(getOnlyFileOrDirName(file))
  );

  return (
    <StyledWrapper>
      <div className="flex">
        <div className="w-full">
          {filteredIgnoredFiles.length > 0 ? (
            filteredIgnoredFiles.map((file, index) => (
              <span className="border p-1 m-1 rounded border-slate-600" title={file} key={index}>
                {getOnlyFileOrDirName(file)}
                &nbsp;
              </span>
            ))
          ) : (
            <span className="text-gray-500">node_modules and .git are ignored by default</span>
          )}
        </div>

        <button className="text-link select-none" onClick={handleManageIconClick}>
          <IconSettings size={20} />
        </button>

        {showModal && <IgnoreFilesModal onClose={() => setShowModal(false)} collection={collection} />}
      </div>
    </StyledWrapper>
  );
};

export default IgnoredFiles;
