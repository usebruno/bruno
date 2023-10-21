import React from 'react';
import Modal from 'components/Modal';
import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import StyledWrapper from './StyledWrapper';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { updateCollectionProperties } from 'providers/ReduxStore/slices/collections/actions';

function countRequests(items) {
  let count = 0;

  function recurse(item) {
    if (item && typeof item === 'object') {
      if (item.type !== 'folder') {
        count++;
      }
      if (Array.isArray(item.items)) {
        item.items.forEach(recurse);
      }
    }
  }

  items.forEach(recurse);

  return count;
}

const CollectionProperties = ({ collection, onClose }) => {
  const dispatch = useDispatch();
  const {
    brunoConfig: { properties: defaultProperties = {} }
  } = collection;
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      defaultType: defaultProperties.defaultType || 'http-request',
      defaultUrl: defaultProperties.defaultUrl || ''
    },
    onSubmit: (newProperties) => {
      dispatch(updateCollectionProperties(newProperties, collection.uid));
      toast.success('Collection properties updated');
      onClose();
    }
  });

  const onSubmit = () => formik.handleSubmit();

  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title="Collection Properties"
        confirmText="Update"
        handleConfirm={onSubmit}
        handleCancel={onClose}
      >
        <form className="bruno-form" onSubmit={formik.handleSubmit}>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="">
                <td className="py-2 px-2 text-right">Name&nbsp;:</td>
                <td className="py-2 px-2">{collection.name}</td>
              </tr>
              <tr className="">
                <td className="py-2 px-2 text-right">Location&nbsp;:</td>
                <td className="py-2 px-2 break-all">{collection.pathname}</td>
              </tr>
              <tr className="">
                <td className="py-2 px-2 text-right">Environments&nbsp;:</td>
                <td className="py-2 px-2">{collection.environments?.length || 0}</td>
              </tr>
              <tr className="">
                <td className="py-2 px-2 text-right">Requests&nbsp;:</td>
                <td className="py-2 px-2">{countRequests(collection.items)}</td>
              </tr>
              <tr className="">
                <td className="py-2 px-2 text-right">Default Request Type&nbsp;:</td>
                <td className="py-2 px-2">
                  <div className="flex items-center mt-2">
                    <input
                      id="http-request"
                      className="cursor-pointer"
                      type="radio"
                      name="defaultType"
                      onChange={formik.handleChange}
                      value="http-request"
                      checked={formik.values.defaultType === 'http-request'}
                    />
                    <label htmlFor="http-request" className="ml-1 cursor-pointer select-none">
                      HTTP
                    </label>

                    <input
                      id="graphql-request"
                      className="ml-4 cursor-pointer"
                      type="radio"
                      name="defaultType"
                      onChange={formik.handleChange}
                      value="graphql-request"
                      checked={formik.values.defaultType === 'graphql-request'}
                    />
                    <label htmlFor="graphql-request" className="ml-1 cursor-pointer select-none">
                      GraphQL
                    </label>
                  </div>
                </td>
              </tr>
              <tr className="">
                <td className="py-2 px-2 text-right">Default Base URL&nbsp;:</td>
                <td className="py-2 px-2">
                  <div className="flex items-center mt-2 ">
                    <div className="flex items-center flex-grow input-container h-full">
                      <input
                        id="request-url"
                        type="text"
                        name="defaultUrl"
                        className="px-3 w-full "
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        onChange={formik.handleChange}
                        value={formik.values.defaultUrl || ''}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="mt-4">
            {formik.touched.defaultUrl && formik.errors.defaultUrl ? (
              <div className="text-red-500">{formik.errors.defaultUrl}</div>
            ) : null}
          </div>
        </form>
      </Modal>
    </StyledWrapper>
  );
};

export default CollectionProperties;
