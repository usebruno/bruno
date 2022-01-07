import React, { useState, useEffect } from 'react';
import { faFolder } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import StyledWrapper from './StyledWrapper';
import Modal from '../Modal';

const SaveRequestButton = ({folders}) => {
  const [openSaveRequestModal, setOpenSaveRequestModal] = useState(false);
  const [showFolders, setShowFolders] = useState([]);

  useEffect(() => {
    setShowFolders(folders);
  }, [folders, openSaveRequestModal])

  const handleFolderClick = (folder) => {
    let subFolders = [];
    for (let item of folder.items) {
      if (item.items) {
        subFolders.push(item)
      }
    }
    subFolders.length ? setShowFolders(subFolders) : setShowFolders((prev) => prev);
  }

  return (
    <StyledWrapper className="flex items-center">
      <button
        style={{backgroundColor: '#8e44ad'}}
        className="flex items-center h-full text-white active:bg-blue-600 font-bold text-xs px-4 py-2 ml-2 uppercase rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150"
        onClick={() => {
          setOpenSaveRequestModal(true);
        }}
      >
        <span style={{marginLeft: 5}}>Save</span>
      </button>
      {openSaveRequestModal ? (
        <Modal 
          size ="md"
          title ="save request"
          confirmText ="Save"
          cancelText ="Cancel"
          handleCancel = {() => setOpenSaveRequestModal(false)}
          handleConfirm = {() => setOpenSaveRequestModal(false)}
        >
          <p className="mb-2">Select a folder to save request:</p>
          <div className="folder-list">
            {showFolders && showFolders.length ?  showFolders.map((folder) => (
                <div 
                  key={folder.id}
                  className="folder-name"
                  onClick={() => handleFolderClick(folder)}
                >
                  <FontAwesomeIcon className="mr-3 text-gray-500" icon={faFolder} style={{fontSize: 20}}/>
                  {folder.name}
                </div>
            )): null}
          </div>
        </Modal>
      ): null}
    </StyledWrapper>
  )
};

export default SaveRequestButton;
