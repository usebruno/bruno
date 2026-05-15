import React, { useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { renameCollection } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid } from 'utils/collections/index';
import { useTranslation } from 'react-i18next';

const RenameCollection = ({ collectionUid, onClose }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const inputRef = useRef();
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: collection.name
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(1, t('SIDEBAR_COLLECTIONS.MIN_1_CHAR'))
        .required(t('SIDEBAR_COLLECTIONS.NAME_REQUIRED'))
    }),
    onSubmit: (values) => {
      dispatch(renameCollection(values.name, collection.uid))
        .then(() => {
          toast.success(t('SIDEBAR_COLLECTIONS.COLLECTION_RENAMED'));
          onClose();
        })
        .catch((err) => {
          toast.error(err ? err.message : t('SIDEBAR_COLLECTIONS.RENAME_ERROR'));
        });
    }
  });

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const onSubmit = () => formik.handleSubmit();

  return (
    <Modal size="md" title={t('SIDEBAR_COLLECTIONS.RENAME_COLLECTION')} confirmText={t('COMMON.RENAME')} handleConfirm={onSubmit} handleCancel={onClose}>
      <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="name" className="block font-medium">
            {t('SIDEBAR_COLLECTIONS.NAME')}
          </label>
          <input
            id="collection-name"
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
          {formik.touched.name && formik.errors.name ? <div className="text-red-500">{formik.errors.name}</div> : null}
        </div>
      </form>
    </Modal>
  );
};

export default RenameCollection;
