import React, { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import { addEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import * as Yup from 'yup';
import { useDispatch } from 'react-redux';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { validateName, validateNameError } from 'utils/common/regex';

const CreateEnvironment = ({ collection, onClose, onEnvironmentCreated }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const inputRef = useRef();

  const validateEnvironmentName = (name) => {
    return !collection?.environments?.some((env) => env?.name?.toLowerCase().trim() === name?.toLowerCase().trim());
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: ''
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(1, t('COMMON.MUST_BE_AT_LEAST_1_CHAR'))
        .max(255, t('COMMON.MUST_BE_255_CHARS_OR_LESS'))
        .test('is-valid-filename', function (value) {
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
        .required(t('COMMON.NAME_IS_REQUIRED'))
        .test('duplicate-name', t('SIDEBAR.ENVIRONMENT_ALREADY_EXISTS'), validateEnvironmentName)
    }),
    onSubmit: (values) => {
      dispatch(addEnvironment(values.name, collection.uid))
        .then(() => {
          toast.success(t('SIDEBAR.ENVIRONMENT_CREATED'));
          onClose();
          if (onEnvironmentCreated) {
            onEnvironmentCreated();
          }
        })
        .catch(() => toast.error(t('SIDEBAR.ENVIRONMENT_CREATE_ERROR')));
    }
  });

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const onSubmit = () => {
    formik.handleSubmit();
  };

  return (
    <Portal>
      <Modal
        size="md"
        title={t('SIDEBAR.CREATE_ENVIRONMENT')}
        confirmText={t('COMMON.CREATE')}
        handleConfirm={onSubmit}
        handleCancel={onClose}
      >
        <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="name" className="block font-medium">
              {t('SIDEBAR.ENVIRONMENT_NAME')}
            </label>
            <div className="flex items-center mt-2">
              <input
                id="environment-name"
                type="text"
                name="name"
                ref={inputRef}
                className="block textbox w-full"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={formik.handleChange}
                value={formik.values.name || ''}
              />
            </div>
            {formik.touched.name && formik.errors.name ? (
              <div className="text-red-500">{formik.errors.name}</div>
            ) : null}
          </div>
        </form>
      </Modal>
    </Portal>
  );
};

export default CreateEnvironment;
