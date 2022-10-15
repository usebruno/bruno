import React, { useEffect, useRef } from 'react';
import Portal from "components/Portal/index";
import Modal from "components/Modal/index";
import { useFormik } from 'formik';
import { renameWorkspace } from 'providers/ReduxStore/slices/workspaces';
import * as Yup from 'yup';
import { useDispatch } from 'react-redux';

const EditWorkspace = ({onClose, workspace}) => {
  const dispatch = useDispatch();
  const inputRef = useRef();
  const formik = useFormik({
		enableReinitialize: true,
    initialValues: {
      name: workspace.name
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(1, 'must be atleast 1 characters')
        .max(30, 'must be 30 characters or less')
        .required('name is required')
    }),
    onSubmit: (values) => {
      dispatch(renameWorkspace({name: values.name, uid: workspace.uid}));
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
        title={"Rename Workspace"}
        confirmText='Rename'
        handleConfirm={onSubmit}
        handleCancel={onClose}
      >
        <form className="bruno-form" onSubmit={formik.handleSubmit}>
          <div>
            <label htmlFor="name" className="block font-semibold">Workspace Name</label>
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

export default EditWorkspace;

