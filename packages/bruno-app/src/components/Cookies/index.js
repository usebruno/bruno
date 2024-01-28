import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import { IconTrash } from '@tabler/icons';
import { deleteCookiesForDomain, addCookiesForURL } from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';

import StyledWrapper from './StyledWrapper';

const CollectionProperties = ({ onClose }) => {
  const dispatch = useDispatch();
  const cookies = useSelector((state) => state.app.cookies) || [];

  const handleDeleteDomain = (domain, path) => {
    dispatch(deleteCookiesForDomain(domain, path))
      .then(() => {
        toast.success('Domain deleted successfully');
      })
      .catch((err) => console.log(err) && toast.error('Failed to delete domain'));
  };

  const formik = useFormik({
    initialValues: {
      url: '',
      cookieString: ''
    },
    onSubmit: (values) => {
      dispatch(addCookiesForURL(values))
        .then(() => {
          toast.success(`Cookie added successfully ${values.url}, ${values.cookieString}:`);
        })
        .catch((err) => console.log(err) && toast.error('Failed to add cookie'));

      formik.resetForm();
    }
  });

  return (
    <Modal size="md" title="Cookies" hideFooter={true} handleCancel={onClose}>
      <StyledWrapper>
        <table className="w-full border-collapse" style={{ marginTop: '-1rem' }}>
          <thead>
            <tr>
              <th className="py-2 px-2 text-left">Domain & Path</th>
              <th className="py-2 px-2 text-left">Cookie</th>
              <th className="py-2 px-2 text-center" style={{ width: 80 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {cookies.map((cookie) => (
              <tr key={cookie.domainPath}>
                <td className="py-2 px-2">{cookie.domainPath}</td>
                <td className="py-2 px-2 break-all">{cookie.cookieString}</td>
                <td className="text-center">
                  <button
                    tabIndex="-1"
                    onClick={() => handleDeleteDomain(cookie.cookies[0].domain, cookie.cookies[0].path)}
                  >
                    <IconTrash strokeWidth={1.5} size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h1 className="font-medium mb-3">Add new cookie:</h1>
        <form className="bruno-form" onSubmit={formik.handleSubmit}>
          <div>
            <div className="mb-3 flex items-center">
              <label htmlFor="url" className="settings-label">
                URL:
              </label>
              <input
                type="text"
                cols="33"
                id="url"
                name="url"
                className="block textbox"
                onChange={formik.handleChange}
                value={formik.values.url}
                required
              />
            </div>
            <div className="mb-3 flex items-center">
              <label htmlFor="cookieString" className="settings-label">
                Cookie String:
              </label>
              <textarea
                type="text"
                rows="5"
                cols="33"
                id="cookieString"
                name="cookieString"
                className="block textbox"
                onChange={formik.handleChange}
                value={formik.values.cookieString}
                required
              />
            </div>

            <div className="mt-6">
              <button type="submit" className="submit btn btn-md btn-secondary">
                Add Cookie
              </button>
            </div>
          </div>
        </form>
      </StyledWrapper>
    </Modal>
  );
};

export default CollectionProperties;
