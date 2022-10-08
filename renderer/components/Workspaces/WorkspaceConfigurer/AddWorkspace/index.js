import React, { useEffect, useRef } from 'react';
import Portal from "components/Portal/index";
import Modal from "components/Modal/index";
import { useFormik } from 'formik';
import { addWorkspace } from 'providers/ReduxStore/slices/workspaces';
import * as Yup from 'yup';
import { useDispatch } from 'react-redux';

const AddWorkspace = ({onClose}) => {
  const dispatch = useDispatch();
  const inputRef = useRef();
  const formik = useFormik({
		enableReinitialize: true,
    initialValues: {
      name: ""
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(1, 'must be atleast 1 characters')
        .max(30, 'must be 30 characters or less')
        .required('name is required')
    }),
    onSubmit: (values) => {
      dispatch(addWorkspace({name: values.name}));
      onClose();
    }
  });

  useEffect(() => {
    if(inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const onSubmit = () => {
    formik.handleSubmit();
  }

  return (
    <Portal>
      <Modal
        size="sm"
        title={"Add Workspace"}
        confirmText='Add'
        handleConfirm={onSubmit}
        handleCancel={onClose}
      >
        <form className="bruno-form" onSubmit={formik.handleSubmit}>
          <div>
            <label htmlFor="name" className="block font-semibold">Workpsace Name</label>
            <input
              id="workspace-name" type="text" name="name"
              ref={inputRef}
              className="block textbox mt-2 w-full"
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
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
}

export default AddWorkspace;

