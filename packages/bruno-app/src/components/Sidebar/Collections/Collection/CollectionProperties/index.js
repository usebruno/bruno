import React from 'react';
import Modal from 'components/Modal';

function countRequests(items) {
  let count = 0;

  function recurse(item) {
    if (item && typeof item === 'object') {
      if (item.type !== 'folder') {
        count++;
      }
      if (Array.isArray(item.items)) {
        item.items.forEach(recurse);
      }
    }
  }

  items.forEach(recurse);

  return count;
}

const CollectionProperties = ({ collection, onClose }) => {
  return (
    <Modal size="sm" title="Collection Properties" hideFooter={true} handleCancel={onClose}>
      <table className="w-full border-collapse">
        <tbody>
          <tr className="">
            <td className="py-2 px-2 text-right">Name&nbsp;:</td>
            <td className="py-2 px-2">{collection.name}</td>
          </tr>
          <tr className="">
            <td className="py-2 px-2 text-right">Location&nbsp;:</td>
            <td className="py-2 px-2 break-all">{collection.pathname}</td>
          </tr>
          <tr className="">
            <td className="py-2 px-2 text-right">Environments&nbsp;:</td>
            <td className="py-2 px-2">{collection.environments?.length || 0}</td>
          </tr>
          <tr className="">
            <td className="py-2 px-2 text-right">Requests&nbsp;:</td>
            <td className="py-2 px-2">{countRequests(collection.items)}</td>
          </tr>
        </tbody>
      </table>
    </Modal>
  );
};

export default CollectionProperties;
