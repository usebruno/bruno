import Modal from 'components/Modal/index';
import React, { useState } from 'react';
import CreateEnvironment from './CreateEnvironment';
import EnvironmentList from './EnvironmentList';
import StyledWrapper from './StyledWrapper';
import ImportEnvironment from './ImportEnvironment';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { variableNameRegex } from 'utils/common/regex';
import { useDispatch } from 'react-redux';
import { saveEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import cloneDeep from 'lodash/cloneDeep';
import toast from 'react-hot-toast';

const EnvironmentSettings = ({ collection, onClose }) => {
  const dispatch = useDispatch();

  const [isModified, setIsModified] = useState(false); // Added this here, since this is the "parent" component

  const { environments } = collection;
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);

  //Putting formik here instead of in environment variables (so formik can be passed to envlist, envdetail, then envvarables)
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: selectedEnvironment ? selectedEnvironment.variables : [], //removed this: selectedEnvironment.variables || []; changed from environment to selectedEnvironment
    validationSchema: Yup.array().of(
      Yup.object({
        enabled: Yup.boolean(),
        name: Yup.string()
          .required('Name cannot be empty')
          .matches(
            variableNameRegex,
            'Name contains invalid characters. Must only contain alphanumeric characters, "-", "_", "." and cannot start with a digit.'
          )
          .trim(),
        secret: Yup.boolean(),
        type: Yup.string(),
        uid: Yup.string(),
        value: Yup.string().trim().nullable()
      })
    ),
    onSubmit: (values) => {
      if (!formik.dirty) {
        toast.error('Nothing to save');
        return;
      }

      dispatch(saveEnvironment(cloneDeep(values), selectedEnvironment.uid, collection.uid))
        .then(() => {
          toast.success('Changes saved successfully');
          formik.resetForm({ values });
          // toast.success('(modified set to false)');
          setIsModified(false); //added to say we don't have changes compared old (we saved, so new = old.)
        })
        .catch(() => toast.error('An error occurred while saving the changes'));
    }
  });

  if (!environments || !environments.length) {
    return (
      <StyledWrapper>
        <Modal
          size="md"
          title="Environments"
          confirmText={'Close'}
          handleConfirm={onClose}
          handleCancel={onClose}
          hideCancel={true}
        >
          {openCreateModal && <CreateEnvironment collection={collection} onClose={() => setOpenCreateModal(false)} />}
          {openImportModal && <ImportEnvironment collection={collection} onClose={() => setOpenImportModal(false)} />}
          <div className="text-center flex flex-col">
            <p>No environments found!</p>
            <button
              className="btn-create-environment text-link pr-2 py-3 mt-2 select-none"
              onClick={() => setOpenCreateModal(true)}
            >
              <span>Create Environment</span>
            </button>

            <span>Or</span>

            <button
              className="btn-import-environment text-link pl-2 pr-2 py-3 select-none"
              onClick={() => setOpenImportModal(true)}
            >
              <span>Import Environment</span>
            </button>
          </div>
        </Modal>
      </StyledWrapper>
    );
  }

  return (
    <Modal size="lg" title="Environments" handleCancel={onClose} hideFooter={true}>
      {/* Pass isModified as a prop */}
      <EnvironmentList
        selectedEnvironment={selectedEnvironment}
        setSelectedEnvironment={setSelectedEnvironment}
        collection={collection}
        isModified={isModified} // Pass isModified to EnvironmentList
        setIsModified={setIsModified} // Pass setIsModified to EnvironmentList
        formik={formik}
      />
    </Modal>
  );
};

export default EnvironmentSettings;
