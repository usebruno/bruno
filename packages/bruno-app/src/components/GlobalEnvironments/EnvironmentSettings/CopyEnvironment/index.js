import Modal from 'components/Modal/index';
import Portal from 'components/Portal/index';
import { useFormik } from 'formik';
import { copyGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import * as Yup from 'yup';

const CopyEnvironment = ({ environment, onClose }) => {
  const dispatch = useDispatch();
  const inputRef = useRef();
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: environment.name + ' - Copy'
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(1, 'must be at least 1 character')
        .max(50, 'must be 50 characters or less')
        .required('name is required')
    }),
    onSubmit: (values) => {
      dispatch(copyGlobalEnvironment({ name: values.name, environmentUid: environment.uid }))
        .then(() => {
          toast.success('Global environment created!');
          onClose();
        })
        .catch((error) => {
          toast.error('An error occurred while created the environment');
          console.error(error);
        });
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
      <Modal size="sm" title={'Copy Global Environment'} confirmText="Copy" handleConfirm={onSubmit} handleCancel={onClose}>
        <form className="bruno-form" onSubmit={e => e.preventDefault()}>
          <div>
            <label htmlFor="name" className="block font-semibold">
              New Environment Name
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
