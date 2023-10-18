import React from 'react';
import { IconCertificate, IconTrash, IconWorld } from '@tabler/icons';
import { useFormik } from 'formik';
import { uuid } from 'utils/common';
import * as Yup from 'yup';

import StyledWrapper from './StyledWrapper';

const ClientCertSettings = ({ clientCertConfig, onUpdate, onRemove }) => {
  const formik = useFormik({
    initialValues: {
      domain: '',
      certFilePath: '',
      keyFilePath: '',
      passphrase: ''
    },
    validationSchema: Yup.object({
      domain: Yup.string().required(),
      certFilePath: Yup.string().required(),
      keyFilePath: Yup.string().required(),
      passphrase: Yup.string()
    }),
    onSubmit: (values) => {
      onUpdate(values);
    }
  });

  const getFile = (e) => {
    formik.values[e.name] = e.files[0].path;
  };

  return (
    <StyledWrapper>
      <div className="flex items-center font-semibold mt-4 mb-2">
        <IconCertificate className="mr-1 certificate-icon" size={24} strokeWidth={1.5} /> Client Certificates
      </div>
      <ul className="mt-4">
        {!clientCertConfig.length
          ? 'None'
          : clientCertConfig.map((clientCert) => (
              <li key={uuid()} className="flex items-center available-certificates p-2 rounded-lg mb-2">
                <div className="flex items-center w-full justify-between">
                  <div className="flex items-center">
                    <IconWorld className="mr-2" size={18} strokeWidth={1.5} />
                    {clientCert.domain}
                  </div>
                  <button onClick={() => onRemove(clientCert)} className="remove-certificate ml-2">
                    <IconTrash size={18} strokeWidth={1.5} />
                  </button>
                </div>
              </li>
            ))}
      </ul>

      <h1 className="font-semibold mt-8 mb-2">Add Client Certicate</h1>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="domain">
            Domain
          </label>
          <input
            id="domain"
            type="text"
            name="domain"
            placeholder="*.example.org"
            className="block textbox"
            onChange={formik.handleChange}
            value={formik.values.domain || ''}
          />
          {formik.touched.domain && formik.errors.domain ? (
            <div className="ml-1 text-red-500">{formik.errors.domain}</div>
          ) : null}
        </div>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="certFilePath">
            Cert file
          </label>
          <input
            id="certFilePath"
            type="file"
            name="certFilePath"
            className="block"
            onChange={(e) => getFile(e.target)}
          />
          {formik.touched.certFilePath && formik.errors.certFilePath ? (
            <div className="ml-1 text-red-500">{formik.errors.certFilePath}</div>
          ) : null}
        </div>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="keyFilePath">
            Key file
          </label>
          <input
            id="keyFilePath"
            type="file"
            name="keyFilePath"
            className="block"
            onChange={(e) => getFile(e.target)}
          />
          {formik.touched.keyFilePath && formik.errors.keyFilePath ? (
            <div className="ml-1 text-red-500">{formik.errors.keyFilePath}</div>
          ) : null}
        </div>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="passphrase">
            Passphrase
          </label>
          <input
            id="passphrase"
            type="text"
            name="passphrase"
            className="block textbox"
            onChange={formik.handleChange}
            value={formik.values.passphrase || ''}
          />
          {formik.touched.passphrase && formik.errors.passphrase ? (
            <div className="ml-1 text-red-500">{formik.errors.passphrase}</div>
          ) : null}
        </div>
        <div className="mt-6">
          <button type="submit" className="submit btn btn-sm btn-secondary">
            Add
          </button>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default ClientCertSettings;
