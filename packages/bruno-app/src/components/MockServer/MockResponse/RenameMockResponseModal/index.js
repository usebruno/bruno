import { useEffect, useRef } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { buildMockResponseNameSchema } from 'utils/mock-server/mock-responses';

const RenameMockResponseModal = ({
  response,
  existingResponses = [],
  onClose,
  onConfirm,
  isSaving = false
}) => {
  const inputRef = useRef();

  const formik = useFormik({
    enableReinitialize: true,
    validateOnMount: true,
    initialValues: {
      name: response?.name || ''
    },
    validationSchema: Yup.object({
      name: buildMockResponseNameSchema({ existingResponses, excludeUid: response?.uid })
    }),
    onSubmit: (values) => onConfirm(values.name.trim())
  });

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  return (
    <Portal>
      <Modal
        size="sm"
        title="Rename Mock Response"
        confirmText={isSaving ? 'Renaming...' : 'Rename'}
        cancelText="Cancel"
        handleConfirm={() => formik.handleSubmit()}
        handleCancel={onClose}
        confirmDisabled={isSaving || formik.isSubmitting || !formik.isValid}
        dataTestId="rename-mock-response-modal"
      >
        <form className="bruno-form" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="mock-response-rename-name" className="block font-medium">
            Name
          </label>
          <input
            id="mock-response-rename-name"
            name="name"
            ref={inputRef}
            type="text"
            className="textbox mt-2 w-full"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            data-testid="mock-response-rename-name-input"
          />
          {formik.touched.name && formik.errors.name ? (
            <div className="text-red-500 mt-1">{formik.errors.name}</div>
          ) : null}
        </form>
      </Modal>
    </Portal>
  );
};

export default RenameMockResponseModal;
