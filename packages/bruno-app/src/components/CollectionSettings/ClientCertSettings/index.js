import React from 'react';
import { IconCertificate, IconTrash, IconWorld } from '@tabler/icons';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import StyledWrapper from './StyledWrapper';
import { useRef } from 'react';
import path from 'utils/common/path';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning/index';
import SingleLineEditor from 'components/SingleLineEditor/index';
import { useDetectSensitiveField } from 'hooks/useDetectSensitiveField/index';
import { useTheme } from 'styled-components';
import { useDispatch } from 'react-redux';
import { updateCollectionClientCertificates } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import get from 'lodash/get';
import Button from 'ui/Button';

const ClientCertSettings = ({ collection }) => {
  const dispatch = useDispatch();

  // Get client certs from draft if exists, otherwise from brunoConfig
  const clientCertConfig = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig.clientCertificates.certs', [])
    : get(collection, 'brunoConfig.clientCertificates.certs', []);
  const certFilePathInputRef = useRef();
  const keyFilePathInputRef = useRef();
  const pfxFilePathInputRef = useRef();
  const { storedTheme } = useTheme();

  const formik = useFormik({
    initialValues: {
      name: '',
      domain: '',
      type: 'cert',
      certFilePath: '',
      keyFilePath: '',
      pfxFilePath: '',
      passphrase: ''
    },
    validationSchema: Yup.object({
      domain: Yup.string()
        .required()
        .trim()
        .test('not-empty-after-trim', 'Domain is required', (value) => value && value.trim().length > 0),
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
          name: values.name?.trim(),
          domain: values.domain?.trim(),
          type: values.type,
          certFilePath: values.certFilePath,
          keyFilePath: values.keyFilePath,
          passphrase: values.passphrase,
          enabled: true
        };
      } else {
        relevantValues = {
          name: values.name?.trim(),
          domain: values.domain?.trim(),
          type: values.type,
          pfxFilePath: values.pfxFilePath,
          passphrase: values.passphrase,
          enabled: true
        };
      }

      // Disable other certs on the same domain (radio-style)
      const newDomain = relevantValues.domain?.toLowerCase();
      const existingCerts = newDomain
        ? clientCertConfig.map((cert) =>
            cert.domain?.trim().toLowerCase() === newDomain ? { ...cert, enabled: false } : cert
          )
        : clientCertConfig;
      const updatedCerts = [...existingCerts, relevantValues];
      const clientCertificates = {
        enabled: true,
        certs: updatedCerts
      };

      dispatch(updateCollectionClientCertificates({
        collectionUid: collection.uid,
        clientCertificates
      }));

      formik.resetForm();
      resetFileInputFields();
    }
  });

  const { isSensitive } = useDetectSensitiveField(collection);
  const { showWarning, warningMessage } = isSensitive(formik.values.passphrase);

  const getFile = (e) => {
    const filePath = window?.ipcRenderer?.getFilePath(e?.files?.[0]);
    if (filePath) {
      let relativePath = path.relative(collection.pathname, filePath);
      formik.setFieldValue(e.name, relativePath);
    }
  };

  const resetFileInputFields = () => {
    if (certFilePathInputRef.current) {
      certFilePathInputRef.current.value = '';
    }
    if (keyFilePathInputRef.current) {
      keyFilePathInputRef.current.value = '';
    }
    if (pfxFilePathInputRef.current) {
      pfxFilePathInputRef.current.value = '';
    }
  };

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

  const handleRemove = (indexToRemove) => {
    const updatedCerts = clientCertConfig.filter((cert, index) => index !== indexToRemove);
    const clientCertificates = {
      enabled: true,
      certs: updatedCerts
    };

    dispatch(updateCollectionClientCertificates({
      collectionUid: collection.uid,
      clientCertificates
    }));
  };

  const handleToggleEnabled = (indexToToggle) => {
    const targetCert = clientCertConfig[indexToToggle];
    if (!targetCert) {
      return;
    }

    const shouldEnable = targetCert.enabled === false;
    const targetDomain = targetCert.domain?.trim().toLowerCase();

    const nextCerts = clientCertConfig.map((cert, index) => {
      if (index === indexToToggle) {
        return { ...cert, enabled: shouldEnable };
      }

      const certDomain = cert.domain?.trim().toLowerCase();
      if (shouldEnable && certDomain && targetDomain && certDomain === targetDomain) {
        return { ...cert, enabled: false };
      }

      return cert;
    });

    const clientCertificates = {
      enabled: true,
      certs: nextCerts
    };

    dispatch(updateCollectionClientCertificates({
      collectionUid: collection.uid,
      clientCertificates
    }));
  };

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

  return (
    <StyledWrapper className="w-full h-full">
      <div className="text-xs mb-4 text-muted">Add client certificates to be used for specific domains.</div>

      <h1 className="font-medium">Client Certificates</h1>
      <ul className="mt-4">
        {!clientCertConfig.length
          ? 'No client certificates added'
          : clientCertConfig.map((clientCert, index) => (
              <li key={`client-cert-${index}`} className="flex items-center available-certificates p-2 rounded-lg mb-2">
                <input
                  type="checkbox"
                  checked={clientCert.enabled !== false}
                  onChange={() => handleToggleEnabled(index)}
                  className="cert-enabled-checkbox"
                />
                <div className="flex items-center w-full justify-between">
                  <div className="flex w-full items-center">
                    <IconWorld className="mr-2" size={18} strokeWidth={1.5} />
                    <span className="certificate-name">
                      {clientCert.name ? `${clientCert.name} - ${clientCert.domain}` : clientCert.domain}
                    </span>
                  </div>
                  <div className="flex w-full items-center">
                    <IconCertificate className="mr-2 flex-shrink-0" size={18} strokeWidth={1.5} />
                    {clientCert.type === 'cert' ? clientCert.certFilePath : clientCert.pfxFilePath}
                  </div>
                  <button onClick={() => handleRemove(index)} className="remove-certificate ml-2">
                    <IconTrash size={18} strokeWidth={1.5} />
                  </button>
                </div>
              </li>
            ))}
      </ul>

      <h1 className="font-medium mt-8 mb-2">Add Client Certificate</h1>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder="Optional label"
            className="block textbox non-passphrase-input"
            onChange={formik.handleChange}
            value={formik.values.name || ''}
          />
        </div>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="domain">
            Domain
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-0 pl-2 text-gray-400 pointer-events-none flex items-center h-full">
              <span className="protocol-placeholder">
                <span className="protocol-https">https://</span>
                <span className="protocol-grpcs">grpcs://</span>
                <span className="protocol-wss">wss://</span>
              </span>
            </div>
            <input
              id="domain"
              type="text"
              name="domain"
              placeholder="example.org"
              className="block textbox non-passphrase-input !pl-[60px]"
              onChange={formik.handleChange}
              value={formik.values.domain || ''}
            />
          </div>
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
                      title={path.basename(formik.values.certFilePath)}
                    >
                      {path.basename(formik.values.certFilePath)}
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
                      title={path.basename(formik.values.keyFilePath)}
                    >
                      {path.basename(formik.values.keyFilePath)}
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
                      title={path.basename(formik.values.pfxFilePath)}
                    >
                      {path.basename(formik.values.pfxFilePath)}
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
            <SingleLineEditor
              value={formik.values.passphrase || ''}
              theme={storedTheme}
              onChange={(val) => formik.setFieldValue('passphrase', val)}
              collection={collection}
              isSecret={true}
            />
            {showWarning && <SensitiveFieldWarning fieldName="basic-password" warningMessage={warningMessage} />}
          </div>
          {formik.touched.passphrase && formik.errors.passphrase ? (
            <div className="ml-1 text-red-500">{formik.errors.passphrase}</div>
          ) : null}
        </div>
        <div className="mt-6 flex flex-row gap-2 items-center">
          <Button type="submit" size="sm" data-testid="add-client-cert">
            Add
          </Button>
          <div className="h-4 border-l border-gray-600"></div>
          <Button type="button" size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default ClientCertSettings;
