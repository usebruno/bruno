import React from 'react';
import Modal from 'components/Modal';
import path from "utils/common/path";

const CollectionItemInfo = ({ collection, item, onClose }) => {
  const { pathname: collectionPathname } = collection;
  const { name, filename, pathname, type } = item;
  const relativePathname = path.relative(collectionPathname, pathname);
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
                    <td className="py-2 px-2 text-right opacity-50">Name&nbsp;:</td>
                    <td className="py-2 px-2 text-nowrap truncate max-w-[500px]" title={name}>{name}</td>
                </tr>
                <tr className="">
                    <td className="py-2 px-2 text-right opacity-50">{type=='folder' ? 'Directory Name' : 'File Name'}&nbsp;:</td>
                    <td className="py-2 px-2 break-all text-nowrap truncate max-w-[500px]" title={filename}>{filename}</td>
                </tr>
                <tr className="">
                    <td className="py-2 px-2 text-right opacity-50">Pathname&nbsp;:</td>
                    <td className="py-2 px-2 break-all text-nowrap truncate max-w-[500px]" title={relativePathname}>{relativePathname}</td>
                </tr>
                </tbody>
            </table>
        </div>
    </Modal>
  );
};

export default CollectionItemInfo;
