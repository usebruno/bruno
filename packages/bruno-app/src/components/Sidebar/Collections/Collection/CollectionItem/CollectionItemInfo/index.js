import React from 'react';
import Modal from 'components/Modal';
import Help from 'components/Help';

const CollectionItemInfo = ({ item, onClose }) => {
  const { name, filename, type } = item;

  return (
    <Modal
      size="md"
      title={`Info`}
      handleCancel={onClose}
      hideCancel={true}
      hideFooter={true}
    >
      <div className="w-fit flex flex-col h-full">
        <table className="w-full border-collapse">
          <tbody>
          <tr className="">
            <td className="py-2 px-2 text-left text-muted ">
              {type=='folder' ? 'Folder Name' : 'Request Name'}
            </td>
            <td className="py-2 px-2 text-nowrap truncate max-w-[500px]" title={name}>
              <span className="mr-2">:</span>{name}
            </td>
          </tr>
          <tr className="">
            <td className="py-2 px-2 text-left text-muted flex items-center">
              {type == 'folder' ? 'Folder Name' : 'File Name'}
              <small className='font-normal text-muted ml-1'>(on filesystem)</small>
              {type == 'folder' ? (
                <Help width="300">
                  <p>
                    The name of the folder on your filesystem.
                  </p>
                </Help>
              ) : (
                <Help width="300">
                  <p>
                    Bruno saves each request as a file in your collection's folder.
                  </p>
                </Help>
              )}
            </td>
            <td className="py-2 px-2 break-all text-nowrap truncate max-w-[500px]" title={filename}>
              <span className="mr-2">:</span>
              {filename}
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
};

export default CollectionItemInfo;
