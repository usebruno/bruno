import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import { IconTrash } from '@tabler/icons';
import { deleteCookie } from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';

import StyledWrapper from './StyledWrapper';

const CollectionProperties = ({ onClose }) => {
  const dispatch = useDispatch();
  const cookies = useSelector((state) => state.app.cookies) || [];

  const handleDeleteCookie = (domain, path, cookieKey) => {
    dispatch(deleteCookie(domain, path, cookieKey))
      .then(() => {
        toast.success('Cookie deleted successfully');
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to delete cookie');
      });
  };



  return (
    <Modal size="lg" title="Cookies" hideFooter={true} handleCancel={onClose}>
      <StyledWrapper>
        <table
          className="w-full border-collapse"
          style={{ marginTop: '-1rem' }}
        >
          <thead>
            <tr>
              <th className="py-2 px-2 text-left" style={{ width: 120 }}>Domain</th>
              <th className="py-2 px-2 text-left" style={{ width: 150 }}>Name</th>
              <th className="py-2 px-2 text-left">Value</th>
              <th className="py-2 px-2 text-left path-column" style={{ width: 80 }}>Path</th>
              <th className="py-2 px-2 text-left" style={{ width: 160 }}>Expiration Date</th>
              <th
                className="py-2 px-2 text-center"
                style={{ width: 80 }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {cookies.map((domainWithCookies) =>
              domainWithCookies.cookies.map((singleCookie) => (
                <tr
                  key={`${domainWithCookies.domain}_${singleCookie.path}_${singleCookie.key}`}
                >
                  <td className="py-2 px-2">{domainWithCookies.domain}</td>
                  <td className="py-2 px-2 break-all">{singleCookie.key}</td>
                  <td className="py-2 px-2 break-all w-full">
                    {singleCookie.value}
                  </td>
                  <td className="py-2 px-2 break-all path-column">
                    {singleCookie.path}
                  </td>
                  <td className="py-2 px-2 break-all">
                    {singleCookie.expires
                      ? new Date(singleCookie.expires).toLocaleString()
                      : 'Session'}
                  </td>
                  <td className="text-center">
                    <button
                      tabIndex="-1"
                      onClick={() =>
                        handleDeleteCookie(
                          domainWithCookies.domain,
                          singleCookie.path,
                          singleCookie.key
                        )
                      }
                    >
                      <IconTrash strokeWidth={1.5} size={20} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </StyledWrapper>
    </Modal>
  );
};

export default CollectionProperties;
