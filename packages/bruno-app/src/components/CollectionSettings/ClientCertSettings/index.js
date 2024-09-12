import React from 'react';
import { IconCertificate, IconTrash, IconWorld } from '@tabler/icons';
import { useFormik } from 'formik';
import { uuid } from 'utils/common';
import * as Yup from 'yup';
import { IconEye, IconEyeOff } from '@tabler/icons';
import { useState } from 'react';

import StyledWrapper from './StyledWrapper';
import { useRef } from 'react';
import path from 'path';
import slash from 'utils/common/slash';
import { isWindowsOS } from 'utils/common/platform';

const ClientCertSettings = ({ root, clientCertConfig, onUpdate, onRemove }) => {
  const certFilePathInputRef = useRef();
  const keyFilePathInputRef = useRef();
  const pfxFilePathInputRef = useRef();

  const formik = useFormik({
    initialValues: {
      domain: '',
      type: 'cert',
      certFilePath: '',
      keyFilePath: '',
      pfxFilePath: '',
      passphrase: ''
    },
    validationSchema: Yup.object({
      domain: Yup.string().required(),
      type: Yup.string().required().oneOf(['cert', 'pfx']),
      certFilePath: Yup.string().when('type', {
        is: (type) => type == 'cert',
        then: Yup.string().min(1, 'certFilePath is a required field').required()
      }),
      keyFilePath: Yup.string().when('type', {
        is: (type) => type == 'cert',
        then: Yup.string().min(1, 'keyFilePath is a required field').required()
      }),
      pfxFilePath: Yup.string().when('type', {
        is: (type) => type == 'pfx',
        then: Yup.string().min(1, 'pfxFilePath is a required field').required()
      }),
      passphrase: Yup.string()
    }),
    onSubmit: (values) => {
      let relevantValues = {};
      if (values.type === 'cert') {
        relevantValues = {
          domain: values.domain,
          type: values.type,
          certFilePath: values.certFilePath,
          keyFilePath: values.keyFilePath,
          passphrase: values.passphrase
        };
      } else {
        relevantValues = {
          domain: values.domain,
          type: values.type,
          pfxFilePath: values.pfxFilePath,
          passphrase: values.passphrase
        };
      }
      onUpdate(relevantValues);
      formik.resetForm();
      resetFileInputFields();
    }
  });

  const getFile = (e) => {
    if (e.files?.[0]?.path) {
      let relativePath;
      if (isWindowsOS()) {
        relativePath = slash(path.win32.relative(root, e.files[0].path));
      } else {
        relativePath = path.posix.relative(root, e.files[0].path);
      }
      formik.setFieldValue(e.name, relativePath);
    }
  };

  const resetFileInputFields = () => {
    certFilePathInputRef.current.value = '';
    keyFilePathInputRef.current.value = '';
    pfxFilePathInputRef.current.value = '';
  };

  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleTypeChange = (e) => {
    formik.setFieldValue('type', e.target.value);
    if (e.target.value === 'cert') {
      formik.setFieldValue('pfxFilePath', '');
      pfxFilePathInputRef.current.value = '';
    } else {
      formik.setFieldValue('certFilePath', '');
      certFilePathInputRef.current.value = '';
      formik.setFieldValue('keyFilePath', '');
      keyFilePathInputRef.current.value = '';
    }
  };

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
                  <div className="flex w-full items-center">
                    <IconWorld className="mr-2" size={18} strokeWidth={1.5} />
                    {clientCert.domain}
                  </div>
                  <div className="flex w-full items-center">
                    <IconCertificate className="mr-2 flex-shrink-0" size={18} strokeWidth={1.5} />
                    {clientCert.type === 'cert' ? clientCert.certFilePath : clientCert.pfxFilePath}
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
        <div className="mb-3 flex items-center">
          <label id="type-label" className="settings-label">
            Type
          </label>
          <div className="flex items-center" aria-labelledby="type-label">
            <label className="flex items-center cursor-pointer" htmlFor="cert">
              <input
                id="cert"
                type="radio"
                name="type"
                value="cert"
                checked={formik.values.type === 'cert'}
                onChange={handleTypeChange}
                className="mr-1"
              />
              Cert
            </label>
            <label className="flex items-center ml-4 cursor-pointer" htmlFor="pfx">
              <input
                id="pfx"
                type="radio"
                name="type"
                value="pfx"
                checked={formik.values.type === 'pfx'}
                onChange={handleTypeChange}
                className="mr-1"
              />
              PFX
            </label>
          </div>
        </div>
        {formik.values.type === 'cert' ? (
          <>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="certFilePath">
                Cert file
              </label>
              <div className="flex flex-row gap-2 justify-start">
                <input
                  key="certFilePath"
                  id="certFilePath"
                  type="file"
                  name="certFilePath"
                  className={`non-passphrase-input ${formik.values.certFilePath?.length ? 'hidden' : 'block'}`}
                  onChange={(e) => getFile(e.target)}
                  ref={certFilePathInputRef}
                />
                {formik.values.certFilePath ? (
                  <div className="flex flex-row gap-2 items-center">
                    <div
                      className="my-[3px] overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px]"
                      title={path.basename(slash(formik.values.certFilePath))}
                    >
                      {path.basename(slash(formik.values.certFilePath))}
                    </div>
                    <IconTrash
                      size={18}
                      strokeWidth={1.5}
                      className="ml-2 cursor-pointer"
                      onClick={() => {
                        formik.setFieldValue('certFilePath', '');
                        certFilePathInputRef.current.value = '';
                      }}
                    />
                  </div>
                ) : (
                  <></>
                )}
              </div>
              {formik.touched.certFilePath && formik.errors.certFilePath ? (
                <div className="ml-1 text-red-500">{formik.errors.certFilePath}</div>
              ) : null}
            </div>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="keyFilePath">
                Key file
              </label>
              <div className="flex flex-row gap-2">
                <input
                  key="keyFilePath"
                  id="keyFilePath"
                  type="file"
                  name="keyFilePath"
                  className={`non-passphrase-input ${formik.values.keyFilePath?.length ? 'hidden' : 'block'}`}
                  onChange={(e) => getFile(e.target)}
                  ref={keyFilePathInputRef}
                />
                {formik.values.keyFilePath ? (
                  <div className="flex flex-row gap-2 items-center">
                    <div
                      className="my-[3px] overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px]"
                      title={path.basename(slash(formik.values.keyFilePath))}
                    >
                      {path.basename(slash(formik.values.keyFilePath))}
                    </div>
                    <IconTrash
                      size={18}
                      strokeWidth={1.5}
                      className="ml-2 cursor-pointer"
                      onClick={() => {
                        formik.setFieldValue('keyFilePath', '');
                        keyFilePathInputRef.current.value = '';
                      }}
                    />
                  </div>
                ) : (
                  <></>
                )}
              </div>
              {formik.touched.keyFilePath && formik.errors.keyFilePath ? (
                <div className="ml-1 text-red-500">{formik.errors.keyFilePath}</div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="pfxFilePath">
                PFX file
              </label>
              <div className="flex flex-row gap-2">
                <input
                  key="pfxFilePath"
                  id="pfxFilePath"
                  type="file"
                  name="pfxFilePath"
                  className={`non-passphrase-input ${formik.values.pfxFilePath?.length ? 'hidden' : 'block'}`}
                  onChange={(e) => getFile(e.target)}
                  ref={pfxFilePathInputRef}
                />
                {formik.values.pfxFilePath ? (
                  <div className="flex flex-row gap-2 items-center">
                    <div
                      className="my-[3px] overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px]"
                      title={path.basename(slash(formik.values.pfxFilePath))}
                    >
                      {path.basename(slash(formik.values.pfxFilePath))}
                    </div>
                    <IconTrash
                      size={18}
                      strokeWidth={1.5}
                      className="ml-2 cursor-pointer"
                      onClick={() => {
                        formik.setFieldValue('pfxFilePath', '');
                        pfxFilePathInputRef.current.value = '';
                      }}
                    />
                  </div>
                ) : (
                  <></>
                )}
              </div>
              {formik.touched.pfxFilePath && formik.errors.pfxFilePath ? (
                <div className="ml-1 text-red-500">{formik.errors.pfxFilePath}</div>
              ) : null}
            </div>
          </>
        )}
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
