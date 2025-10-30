import React, { useRef, useEffect, useState, forwardRef } from 'react';
import { useDispatch } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { IconCaretDown } from '@tabler/icons';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { postmanToBruno } from 'utils/importers/postman-collection';
import { convertInsomniaToBruno } from 'utils/importers/insomnia-collection';
import { convertOpenapiToBruno } from 'utils/importers/openapi-collection';
import { processBrunoCollection } from 'utils/importers/bruno-collection';
import { wsdlToBruno } from '@usebruno/converters';
import { toastError } from 'utils/common/error';
import Modal from 'components/Modal';
import Help from 'components/Help';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';

const groupingOptions = [
  { value: 'tags', label: 'Tags', description: 'Group requests by OpenAPI tags', testId: 'grouping-option-tags' },
  { value: 'path', label: 'Paths', description: 'Group requests by URL path structure', testId: 'grouping-option-path' }
];

const ImportCollectionLocation = ({ onClose, handleSubmit, rawData, format }) => {
  const inputRef = useRef();
  const dispatch = useDispatch();
  const [groupingType, setGroupingType] = useState('tags');
  const dropdownTippyRef = useRef();
  const isOpenApi = format === 'openapi';

  // Extract collection name from raw data
  const getCollectionName = () => {
    if (!rawData) return 'Collection';

    switch (format) {
      case 'openapi':
        return rawData.info?.title || 'OpenAPI Collection';
      case 'postman':
        return rawData.info?.name || rawData.collection?.info?.name || 'Postman Collection';
      case 'insomnia':
        // For Insomnia v4 format, name is in the workspace resource
        if (rawData.resources && Array.isArray(rawData.resources)) {
          const workspace = rawData.resources.find((r) => r._type === 'workspace');
          if (workspace?.name) {
            return workspace.name;
          }
        }
        // Fallback to root name property
        return rawData.name || 'Insomnia Collection';
      case 'bruno':
        return rawData.name || 'Bruno Collection';
      case 'wsdl':
        return 'WSDL Collection';
      default:
        return 'Collection';
    }
  };

  const collectionName = getCollectionName();

  // Convert raw data to Bruno collection format
  const convertCollection = async () => {
    try {
      let collection;

      switch (format) {
        case 'openapi':
          collection = convertOpenapiToBruno(rawData, { groupBy: groupingType });
          break;
        case 'wsdl':
          collection = await wsdlToBruno(rawData);
          break;
        case 'postman':
          collection = await postmanToBruno(rawData);
          break;
        case 'insomnia':
          collection = convertInsomniaToBruno(rawData);
          break;
        case 'bruno':
          collection = await processBrunoCollection(rawData);
          break;
        default:
          throw new Error('Unknown collection format');
      }

      return collection;
    } catch (err) {
      console.error('Conversion error:', err);
      toastError(err, 'Failed to convert collection');
      throw err;
    }
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      collectionLocation: ''
    },
    validationSchema: Yup.object({
      collectionLocation: Yup.string()
        .min(1, 'must be at least 1 character')
        .max(500, 'must be 500 characters or less')
        .required('Location is required')
    }),
    onSubmit: async (values) => {
      const convertedCollection = await convertCollection();
      handleSubmit(convertedCollection, values.collectionLocation);
    }
  });

  const onDropdownCreate = (ref) => {
    dropdownTippyRef.current = ref;
  };

  const GroupingDropdownIcon = forwardRef((props, ref) => {
    const selectedOption = groupingOptions.find((option) => option.value === groupingType);
    return (
      <div ref={ref} className="flex items-center justify-between w-full current-group" data-testid="grouping-dropdown">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedOption.label}</div>
        </div>
        <IconCaretDown size={16} className="text-gray-400 ml-[0.25rem]" fill="currentColor" />
      </div>
    );
  });
  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string' && dirPath.length > 0) {
          formik.setFieldValue('collectionLocation', dirPath);
        }
      })
      .catch((error) => {
        formik.setFieldValue('collectionLocation', '');
        console.error(error);
      });
  };

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const onSubmit = () => formik.handleSubmit();

  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title="Import Collection"
        confirmText="Import"
        handleConfirm={onSubmit}
        handleCancel={onClose}
        dataTestId="import-collection-location-modal"
      >
        <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="collectionName" className="block font-semibold">
              Name
            </label>
            <div className="mt-2">{collectionName}</div>

            <>
              <label htmlFor="collectionLocation" className="font-semibold mt-4 flex items-center">
                Location
                <Help>
                  <p>Bruno stores your collections on your computer's filesystem.</p>
                  <p className="mt-2">Choose the location where you want to store this collection.</p>
                </Help>
              </label>
              <input
                id="collection-location"
                type="text"
                name="collectionLocation"
                className="block textbox mt-2 w-full cursor-pointer"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                value={formik.values.collectionLocation || ''}
                onClick={browse}
                onChange={(e) => {
                  formik.setFieldValue('collectionLocation', e.target.value);
                }}
              />
            </>
            {formik.touched.collectionLocation && formik.errors.collectionLocation ? (
              <div className="text-red-500">{formik.errors.collectionLocation}</div>
            ) : null}

            <div className="mt-1">
              <span className="text-link cursor-pointer hover:underline" onClick={browse}>
                Browse
              </span>
            </div>
          </div>

          {isOpenApi && (
            <div className="mt-4 flex gap-4 items-center">
              <div>
                <label htmlFor="groupingType" className="block font-semibold mt-4">
                  Folder arrangement
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-2">
                  Select whether to create folders according to the spec's paths or tags.
                </p>
              </div>
              <div className="relative">
                <Dropdown onCreate={onDropdownCreate} icon={<GroupingDropdownIcon />} placement="bottom-start">
                  {groupingOptions.map((option) => (
                    <div
                      key={option.value}
                      className="dropdown-item"
                      data-testid={option.testId}
                      onClick={() => {
                        dropdownTippyRef?.current?.hide();
                        setGroupingType(option.value);
                      }}
                    >
                      {option.label}
                    </div>
                  ))}
                </Dropdown>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </StyledWrapper>
  );
};

export default ImportCollectionLocation;
