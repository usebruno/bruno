import React from 'react';
import { IconCertificate, IconTrash, IconWorld } from '@tabler/icons';
import { useFormik } from 'formik';
import { uuid } from 'utils/common';
import * as Yup from 'yup';
import { IconEye, IconEyeOff } from '@tabler/icons';
import { useState } from 'react';

import StyledWrapper from './StyledWrapper';

const ClientCertSettings = ({ clientCertConfig, onUpdate, onRemove }) => {
  const formik = useFormik({
    initialValues: {
      domain: '',
      certFilePath: '',
      pfx: false,
      keyFilePath: '',
      passphrase: ''
    },
    validationSchema: Yup.object({
      domain: Yup.string().required(),
      certFilePath: Yup.string().required(),
      pfx: Yup.boolean().required(),
      keyFilePath: Yup.string().when('pfx', { is: (pfx) => !pfx, then: Yup.string().required() }),
      passphrase: Yup.string()
    }),
    onSubmit: (values) => {
      onUpdate(values);
    }
  });

  const getFile = (e) => {
    try {
      formik.setFieldValue(e.name, e.files[0].path, true);
    } catch (err) {
      // User cancelled selection
      formik.setFieldValue(e.name, undefined, true);
    }
  };

  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <StyledWrapper className="w-full h-full">
      <div className="text-xs mb-4 text-muted">Add client certificates to be used for specific domains.</div>

      <h1 className="font-semibold">Client Certificates</h1>
      <ul className="mt-4">
        {!clientCertConfig.length
          ? 'No client certificates added'
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

      <h1 className="font-semibold mt-8 mb-2">Add Client Certificate</h1>
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
            className="block textbox non-passphrase-input"
            onChange={formik.handleChange}
            value={formik.values.domain || ''}
          />
          {formik.touched.domain && formik.errors.domain ? (
            <div className="ml-1 text-red-500">{formik.errors.domain}</div>
          ) : null}
        </div>
        <div className="mb-3 flex items-top">
          <label className="settings-label" htmlFor="certFilePath">
            Cert file
          </label>
          <div>
            <input
              id="certFilePath"
              type="file"
              name="certFilePath"
              className="block non-passphrase-input"
              onChange={(e) => getFile(e.target)}
            />
            <input
              className="cursor-pointer"
              id="pfx"
              name="pfx"
              type="checkbox"
              checked={formik.values.pfx}
              onChange={formik.handleChange}
            />{' '}
            <span>PFX/PKCS12</span>
          </div>
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
            className="block non-passphrase-input"
            onChange={(e) => getFile(e.target)}
            disabled={formik.values.pfx}
          />
          {formik.touched.keyFilePath && formik.errors.keyFilePath ? (
            <div className="ml-1 text-red-500">{formik.errors.keyFilePath}</div>
          ) : null}
        </div>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="passphrase">
            Passphrase
          </label>
          <div className="textbox flex flex-row items-center w-[300px] h-[1.70rem] relative">
            <input
              id="passphrase"
              type={passwordVisible ? 'text' : 'password'}
              name="passphrase"
              className="outline-none w-64 bg-transparent"
              onChange={formik.handleChange}
              value={formik.values.passphrase || ''}
            />
            <button
              type="button"
              className="btn btn-sm absolute right-0 l"
              onClick={() => setPasswordVisible(!passwordVisible)}
            >
              {passwordVisible ? <IconEyeOff size={18} strokeWidth={1.5} /> : <IconEye size={18} strokeWidth={1.5} />}
            </button>
          </div>
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
