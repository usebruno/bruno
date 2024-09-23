import React, { useRef, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import Modal from 'components/Modal';
import { IconAlertTriangle, IconArrowRight, IconCaretDown, IconCaretRight, IconCopy } from '@tabler/icons';
import toast from 'react-hot-toast';

const TranslationLog = ({ translationLog }) => {
  const [showDetails, setShowDetails] = useState(false);
  const preventSetShowDetails = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowDetails(!showDetails);
  };
  const copyClipboard = (e, value) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
  };
  return (
    <div className="flex flex-col mt-2">
      <div className="border-l-2 border-amber-500 dark:border-amber-300 bg-amber-50 dark:bg-amber-50/10 p-1.5 rounded-r">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <IconAlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-300" aria-hidden="true" />
          </div>
          <div className="ml-2">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <span className="font-semibold">Warning:</span> Some commands were not translated.{' '}
            </p>
          </div>
        </div>
      </div>
      <button
        onClick={(e) => preventSetShowDetails(e)}
        className="flex w-fit items-center rounded px-2.5 py-1 mt-2 text-xs font-semibold ring-1 ring-inset bg-slate-50 dark:bg-slate-400/10 text-slate-700 dark:text-slate-300 ring-slate-600/10 dark:ring-slate-400/20"
      >
        See details
        {showDetails ? <IconCaretDown size={16} className="ml-1" /> : <IconCaretRight size={16} className="ml-1" />}
      </button>
      {showDetails && (
        <div className="flex relative flex-col text-xs max-w-[364px] max-h-[300px] overflow-scroll mt-2 p-2 bg-slate-50 dark:bg-slate-400/10 ring-1 ring-inset rounded text-slate-700 dark:text-slate-300 ring-slate-600/20 dark:ring-slate-400/20">
          <span className="font-semibold flex items-center">
            Impacted Collections: {Object.keys(translationLog || {}).length}
          </span>
          <span className="font-semibold flex items-center">
            Impacted Lines:{' '}
            {Object.values(translationLog || {}).reduce(
              (acc, curr) => acc + (curr.script?.length || 0) + (curr.test?.length || 0),
              0
            )}
          </span>
          <span className="my-1">
            The numbers after 'script' and 'test' indicate the line numbers of incomplete translations.
          </span>
          <ul>
            {Object.entries(translationLog || {}).map(([name, value]) => (
              <li key={name} className="list-none text-xs font-semibold">
                <div className="font-semibold flex items-center text-xs whitespace-nowrap">
                  <IconCaretRight className="min-w-4 max-w-4 -ml-1" />
                  {name}
                </div>
                <div className="flex flex-col">
                  {value.script && (
                    <div className="flex items-center text-xs font-light mb-1 flex-wrap">
                      <span className="mr-2">script :</span>
                      {value.script.map((scriptValue, index) => (
                        <span className="flex items-center" key={`script_${name}_${index}`}>
                          <span className="text-xs font-light">{scriptValue}</span>
                          {index < value.script.length - 1 && <> - </>}
                        </span>
                      ))}
                    </div>
                  )}
                  {value.test && (
                    <div className="flex items-center text-xs font-light mb-1 flex-wrap">
                      <span className="mr-2">test :</span>
                      {value.test.map((testValue, index) => (
                        <div className="flex items-center" key={`test_${name}_${index}`}>
                          <span className="text-xs font-light">{testValue}</span>
                          {index < value.test.length - 1 && <> - </>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <button
            className="absolute top-1 right-1 flex w-fit items-center rounded p-2 text-xs font-semibold ring-1 ring-inset bg-slate-50 dark:bg-slate-400/10 text-slate-700 dark:text-slate-300 ring-slate-600/10 dark:ring-slate-400/20"
            onClick={(e) => copyClipboard(e, JSON.stringify(translationLog))}
          >
            <IconCopy size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

const ImportCollectionLocation = ({ onClose, handleSubmit, collectionName, translationLog }) => {
  const inputRef = useRef();
  const dispatch = useDispatch();

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
    onSubmit: (values) => {
      handleSubmit(values.collectionLocation);
    }
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
    <Modal size="sm" title="Import Collection" confirmText="Import" handleConfirm={onSubmit} handleCancel={onClose}>
      <form className="bruno-form" onSubmit={e => e.preventDefault()}>
        <div>
          <label htmlFor="collectionName" className="block font-semibold">
            Name
          </label>
          <div className="mt-2">{collectionName}</div>
          {translationLog && Object.keys(translationLog).length > 0 && (
            <TranslationLog translationLog={translationLog} />
          )}
          <>
            <label htmlFor="collectionLocation" className="block font-semibold mt-3">
              Location
            </label>
            <input
              id="collection-location"
              type="text"
              name="collectionLocation"
              readOnly={true}
              className="block textbox mt-2 w-full cursor-pointer"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={formik.values.collectionLocation || ''}
              onClick={browse}
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
      </form>
    </Modal>
  );
};

export default ImportCollectionLocation;
