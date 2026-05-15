import Modal from 'components/Modal/index';
import Portal from 'components/Portal/index';
import { useFormik } from 'formik';
import { copyEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';

const CopyEnvironment = ({ collection, environment, onClose }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const inputRef = useRef();
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: environment.name + t('ENV_SETTINGS.COPY_SUFFIX')
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(1, t('ENV_SETTINGS.NAME_MIN_LENGTH'))
        .max(50, t('ENV_SETTINGS.NAME_MAX_50'))
        .required(t('ENV_SETTINGS.NAME_REQUIRED'))
    }),
    onSubmit: (values) => {
      dispatch(copyEnvironment(values.name, environment.uid, collection.uid))
        .then(() => {
          toast.success(t('ENV_SETTINGS.ENVIRONMENT_CREATED'));
          onClose();
        })
        .catch(() => toast.error(t('ENV_SETTINGS.ENVIRONMENT_CREATE_ERROR')));
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
      <Modal size="sm" title={t('ENV_SETTINGS.COPY_ENVIRONMENT')} confirmText={t('ENV_SETTINGS.COPY')} handleConfirm={onSubmit} handleCancel={onClose}>
        <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="name" className="block font-medium">
              {t('ENV_SETTINGS.NEW_ENVIRONMENT_NAME')}
            </label>
            <input
              id="environment-name"
              type="text"
              name="name"
              ref={inputRef}
              className="block textbox mt-2 w-full"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              value={formik.values.name || ''}
            />
            {formik.touched.name && formik.errors.name ? (
              <div className="text-red-500">{formik.errors.name}</div>
            ) : null}
          </div>
        </form>
      </Modal>
    </Portal>
  );
};

export default CopyEnvironment;
