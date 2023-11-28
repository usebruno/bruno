import React from 'react';
import { useSelector } from 'react-redux';
import Modal from '@components/Modal';

const CollectionProperties = ({ onClose }) => {
  const cookies = useSelector((state) => state.app.cookies) || [];

  return (
    <Modal size="md" title="Cookies" hideFooter={true} handleCancel={onClose}>
      <table className="w-full border-collapse" style={{ marginTop: '-1rem' }}>
        <thead>
          <tr>
            <th className="py-2 px-2 text-left">Domain</th>
            <th className="py-2 px-2 text-left">Cookie</th>
          </tr>
        </thead>
        <tbody>
          {cookies.map((cookie) => (
            <tr key={cookie.id}>
              <td className="py-2 px-2">{cookie.domain}</td>
              <td className="py-2 px-2 break-all">{cookie.cookieString}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
};

export default CollectionProperties;
