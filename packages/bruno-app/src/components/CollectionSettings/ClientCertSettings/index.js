import React from 'react';
import { IconCertificate, IconTrash, IconFile, IconX, IconUpload, IconPlus, IconEye, IconEyeOff } from '@tabler/icons';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import StyledWrapper from './StyledWrapper';
import { useRef, useState } from 'react';
import Modal from 'components/Modal';
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
import ActionIcon from 'ui/ActionIcon';
import ListGroup from 'ui/ListGroup';
import ToggleSwitch from 'components/ToggleSwitch';

const CertField = ({ label, value, title, action }) => (
  <div className="cert-field">
    <span className="cert-field-label">{label}</span>
    <span className="cert-field-value truncate" title={title}>
      {value}
    </span>
    {action}
  </div>
);

const CertFileInput = ({ label, name, value, inputRef, onSelect, onClear, error, touched, dangerColor }) => (
  <div className="mb-3 flex items-start">
    <label className="settings-label mt-1" htmlFor={name}>
      {label}
    </label>
    <div className="flex flex-col gap-1">
      <input
        key={name}
        id={name}
        type="file"
        name={name}
        className="hidden"
        onChange={(e) => onSelect(e.target)}
        ref={inputRef}
      />
      {value ? (
        <div className="file-chip" data-testid={`file-chip-${name}`}>
          <IconFile size={14} strokeWidth={1.5} className="flex-shrink-0" />
          <span className="truncate max-w-[260px]" title={value}>
            {path.basename(value)}
          </span>
          <ActionIcon type="button" label="Remove file" size="sm" colorOnHover={dangerColor} onClick={onClear}>
            <IconX size={14} strokeWidth={1.5} />
          </ActionIcon>
        </div>
      ) : (
        <Button
          size="xs"
          variant="outline"
          icon={<IconUpload size={13} strokeWidth={1.5} />}
          onClick={() => inputRef.current?.click()}
          data-testid={`choose-file-${name}`}
        >
          Choose file
        </Button>
      )}
      {touched && error ? <div className="text-red-500 text-xs">{error}</div> : null}
    </div>
  </div>
);

const ClientCertSettings = ({ collection }) => {
  const dispatch = useDispatch();
  const [showAddCertModal, setShowAddCertModal] = useState(false);
  const [visiblePassphrases, setVisiblePassphrases] = useState([]);

  const togglePassphraseVisibility = (index) => {
    setVisiblePassphrases((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  };

  // Get client certs from draft if exists, otherwise from brunoConfig
  const clientCertConfig = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig.clientCertificates.certs', [])
    : get(collection, 'brunoConfig.clientCertificates.certs', []);
  const certificateFilePathInputRef = useRef();
  const privateKeyFilePathInputRef = useRef();
  const pkcs12FilePathInputRef = useRef();
  const theme = useTheme();
  const { storedTheme } = theme;

  const formik = useFormik({
    initialValues: {
      domain: '',
      type: 'pem',
      certificateFilePath: '',
      privateKeyFilePath: '',
      pkcs12FilePath: '',
      passphrase: ''
    },
    validationSchema: Yup.object({
      domain: Yup.string()
        .required()
        .trim()
        .test('not-empty-after-trim', 'Domain is required', (value) => value && value.trim().length > 0),
      type: Yup.string().required().oneOf(['pem', 'pkcs12']),
      certificateFilePath: Yup.string().when('type', {
        is: (type) => type == 'pem',
        then: Yup.string().min(1, 'certificateFilePath is a required field').required()
      }),
      privateKeyFilePath: Yup.string().when('type', {
        is: (type) => type == 'pem',
        then: Yup.string().min(1, 'privateKeyFilePath is a required field').required()
      }),
      pkcs12FilePath: Yup.string().when('type', {
        is: (type) => type == 'pkcs12',
        then: Yup.string().min(1, 'pkcs12FilePath is a required field').required()
      }),
      passphrase: Yup.string()
    }),
    onSubmit: (values) => {
      let relevantValues = {};
      if (values.type === 'pem') {
        relevantValues = {
          domain: values.domain?.trim(),
          type: values.type,
          certificateFilePath: values.certificateFilePath,
          privateKeyFilePath: values.privateKeyFilePath,
          passphrase: values.passphrase
        };
      } else {
        relevantValues = {
          domain: values.domain?.trim(),
          type: values.type,
          pkcs12FilePath: values.pkcs12FilePath,
          passphrase: values.passphrase
        };
      }

      // Add the new cert to the existing certs in draft
      const updatedCerts = [...clientCertConfig, relevantValues];
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
      setShowAddCertModal(false);
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
    if (certificateFilePathInputRef.current) {
      certificateFilePathInputRef.current.value = '';
    }
    if (privateKeyFilePathInputRef.current) {
      privateKeyFilePathInputRef.current.value = '';
    }
    if (pkcs12FilePathInputRef.current) {
      pkcs12FilePathInputRef.current.value = '';
    }
  };

  const handleTypeChange = (type) => {
    formik.setFieldValue('type', type);
    if (type === 'pem') {
      formik.setFieldValue('pkcs12FilePath', '');
      if (pkcs12FilePathInputRef.current) pkcs12FilePathInputRef.current.value = '';
    } else {
      formik.setFieldValue('certificateFilePath', '');
      if (certificateFilePathInputRef.current) certificateFilePathInputRef.current.value = '';
      formik.setFieldValue('privateKeyFilePath', '');
      if (privateKeyFilePathInputRef.current) privateKeyFilePathInputRef.current.value = '';
    }
  };

  const handleRemove = (indexToRemove) => {
    // visiblePassphrases tracks cert indexes; removing a cert shifts every later index down by
    // one, so drop the removed index and decrement the ones above it to keep them aligned.
    setVisiblePassphrases((previousIndexes) =>
      previousIndexes
        .filter((index) => index !== indexToRemove)
        .map((index) => (index > indexToRemove ? index - 1 : index))
    );
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

  const handleToggleDisabled = (indexToToggle) => {
    const updatedCerts = clientCertConfig.map((cert, index) => {
      if (index !== indexToToggle) return cert;
      const updatedCert = { ...cert };
      // Persist the flag only when the cert is disabled; enabled is the default.
      if (updatedCert.disabled) {
        delete updatedCert.disabled;
      } else {
        updatedCert.disabled = true;
      }
      return updatedCert;
    });

    dispatch(updateCollectionClientCertificates({
      collectionUid: collection.uid,
      clientCertificates: { enabled: true, certs: updatedCerts }
    }));
  };

  const openAddCertModal = () => {
    formik.resetForm();
    resetFileInputFields();
    setShowAddCertModal(true);
  };

  const clearFileField = (name, inputRef) => {
    formik.setFieldValue(name, '');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

  return (
    <StyledWrapper className="w-full h-full">
      <h1 className="font-medium text-[0.9375rem]">Client Certificates</h1>
      <div className="text-xs mt-1 text-muted">Add client certificates to be used for specific domains.</div>

      <ListGroup
        className="mt-5"
        items={clientCertConfig}
        getKey={(_, index) => `client-cert-${index}`}
        emptyState={{
          icon: <IconCertificate size={24} strokeWidth={1.2} />,
          title: 'No client certificates',
          text: 'Certificates added here are sent automatically with requests to their matching domains.'
        }}
        addButton={{
          label: 'Add Certificate',
          onClick: openAddCertModal,
          icon: <IconPlus size={15} strokeWidth={1.5} />,
          dataTestId: 'add-client-cert'
        }}
        footerActions={(
          <Button type="button" size="sm" data-testid="client-cert-save-btn" onClick={handleSave}>
            Save
          </Button>
        )}
        renderItem={(clientCert, index) => (
          <ListGroup.Item
            disabled={clientCert.disabled}
            leading={<IconCertificate className="cert-icon" size={20} strokeWidth={1.5} />}
            actions={(
              <>
                <ToggleSwitch
                  size="2xs"
                  isOn={!clientCert.disabled}
                  handleToggle={() => handleToggleDisabled(index)}
                  title={clientCert.disabled ? 'Enable certificate' : 'Disable certificate'}
                />
                <ActionIcon
                  label="Remove certificate"
                  colorOnHover={theme.colors.text.danger}
                  onClick={() => handleRemove(index)}
                >
                  <IconTrash size={16} strokeWidth={1.5} />
                </ActionIcon>
              </>
            )}
          >
            <CertField label="Host" value={clientCert.domain} title={clientCert.domain} />
            {clientCert.type === 'pkcs12' ? (
              <CertField label="PFX File" value={path.basename(clientCert.pkcs12FilePath || '')} title={clientCert.pkcs12FilePath} />
            ) : (
              <>
                <CertField label="Cert File" value={path.basename(clientCert.certificateFilePath || '')} title={clientCert.certificateFilePath} />
                <CertField label="Key File" value={path.basename(clientCert.privateKeyFilePath || '')} title={clientCert.privateKeyFilePath} />
              </>
            )}
            {clientCert.passphrase ? (
              <CertField
                label="Passphrase"
                value={visiblePassphrases.includes(index) ? clientCert.passphrase : '••••••••'}
                action={(
                  <ActionIcon
                    size="sm"
                    className={visiblePassphrases.includes(index) ? 'stay-visible' : ''}
                    label={visiblePassphrases.includes(index) ? 'Hide passphrase' : 'Show passphrase'}
                    onClick={() => togglePassphraseVisibility(index)}
                  >
                    {visiblePassphrases.includes(index) ? (
                      <IconEyeOff size={14} strokeWidth={1.5} />
                    ) : (
                      <IconEye size={14} strokeWidth={1.5} />
                    )}
                  </ActionIcon>
                )}
              />
            ) : null}
          </ListGroup.Item>
        )}
      />

      {showAddCertModal && (
        <Modal
          size="md"
          title="Add Client Certificate"
          confirmText="Add"
          dataTestId="add-client-cert-modal"
          handleConfirm={formik.handleSubmit}
          handleCancel={() => setShowAddCertModal(false)}
        >
          <div className="text-xs mb-4 text-muted">
            The certificate and key files are stored as paths relative to the collection.
          </div>
          {/* Submission is driven by the Modal's confirm button/Enter (handleConfirm); prevent the form's own submit to avoid firing twice */}
          <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
            <div className="mb-3 flex items-start">
              <label className="settings-label mt-1" htmlFor="domain">
                Domain
              </label>
              <div className="flex flex-col gap-1">
                <div className="relative flex items-center">
                  <div className="absolute left-0 pl-2 pointer-events-none flex items-center h-full">
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
                  <div className="text-red-500 text-xs">{formik.errors.domain}</div>
                ) : null}
              </div>
            </div>
            <div className="mb-3 flex items-center">
              <label id="type-label" className="settings-label">
                Type
              </label>
              <div className="type-picker" role="radiogroup" aria-labelledby="type-label">
                <button
                  type="button"
                  role="radio"
                  aria-checked={formik.values.type === 'pem'}
                  className={`type-option ${formik.values.type === 'pem' ? 'active' : ''}`}
                  onClick={() => handleTypeChange('pem')}
                >
                  Cert &amp; Key
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={formik.values.type === 'pkcs12'}
                  className={`type-option ${formik.values.type === 'pkcs12' ? 'active' : ''}`}
                  onClick={() => handleTypeChange('pkcs12')}
                >
                  PFX
                </button>
              </div>
            </div>
            {formik.values.type === 'pem' ? (
              <>
                <CertFileInput
                  label="Cert file"
                  name="certificateFilePath"
                  value={formik.values.certificateFilePath}
                  inputRef={certificateFilePathInputRef}
                  onSelect={getFile}
                  onClear={() => clearFileField('certificateFilePath', certificateFilePathInputRef)}
                  error={formik.errors.certificateFilePath}
                  touched={formik.touched.certificateFilePath}
                  dangerColor={theme.colors.text.danger}
                />
                <CertFileInput
                  label="Key file"
                  name="privateKeyFilePath"
                  value={formik.values.privateKeyFilePath}
                  inputRef={privateKeyFilePathInputRef}
                  onSelect={getFile}
                  onClear={() => clearFileField('privateKeyFilePath', privateKeyFilePathInputRef)}
                  error={formik.errors.privateKeyFilePath}
                  touched={formik.touched.privateKeyFilePath}
                  dangerColor={theme.colors.text.danger}
                />
              </>
            ) : (
              <CertFileInput
                label="PFX file"
                name="pkcs12FilePath"
                value={formik.values.pkcs12FilePath}
                inputRef={pkcs12FilePathInputRef}
                onSelect={getFile}
                onClear={() => clearFileField('pkcs12FilePath', pkcs12FilePathInputRef)}
                error={formik.errors.pkcs12FilePath}
                touched={formik.touched.pkcs12FilePath}
                dangerColor={theme.colors.text.danger}
              />
            )}
            <div className="mb-3 flex items-start">
              <label className="settings-label mt-1" htmlFor="passphrase">
                Passphrase
              </label>
              <div className="flex flex-col gap-1">
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
                  <div className="text-red-500 text-xs">{formik.errors.passphrase}</div>
                ) : null}
              </div>
            </div>
          </form>
        </Modal>
      )}
    </StyledWrapper>
  );
};

export default ClientCertSettings;
