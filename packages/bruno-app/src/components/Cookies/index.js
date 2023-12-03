import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import { IconTrash } from '@tabler/icons';
import { deleteCookiesForDomain } from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';

import StyledWrapper from './StyledWrapper';

const CollectionProperties = ({ onClose }) => {
  const dispatch = useDispatch();
  const cookies = useSelector((state) => state.app.cookies) || [];

  const handleDeleteDomain = (domain) => {
    dispatch(deleteCookiesForDomain(domain))
      .then(() => {
        toast.success('Domain deleted successfully');
      })
      .catch((err) => console.log(err) && toast.error('Failed to delete domain'));
  };

  return (
    <Modal size="md" title="Cookies" hideFooter={true} handleCancel={onClose}>
      <StyledWrapper>
        <table className="w-full border-collapse" style={{ marginTop: '-1rem' }}>
          <thead>
            <tr>
              <th className="py-2 px-2 text-left">Domain</th>
              <th className="py-2 px-2 text-left">Cookie</th>
              <th className="py-2 px-2 text-center" style={{ width: 80 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {cookies.map((cookie) => (
              <tr key={cookie.domain}>
                <td className="py-2 px-2">{cookie.domain}</td>
                <td className="py-2 px-2 break-all">{cookie.cookieString}</td>
                <td className="text-center">
                  <button tabIndex="-1" onClick={() => handleDeleteDomain(cookie.domain)}>
                    <IconTrash strokeWidth={1.5} size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </StyledWrapper>
    </Modal>
  );
};

export default CollectionProperties;
