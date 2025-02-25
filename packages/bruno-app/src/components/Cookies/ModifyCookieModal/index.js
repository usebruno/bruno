import React, { useState, useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from 'components/Modal/index';
import { modifyCookie, addCookie, getParsedCookie, createCookieString } from 'providers/ReduxStore/slices/app';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { isValidDomain } from 'utils/common/index';
import ToggleSwitch from 'components/ToggleSwitch/index';

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
};

const ModifyCookieModal = ({ onClose, domain, cookie }) => {
  const dispatch = useDispatch();
  const [isRawMode, setIsRawMode] = useState(false);
  const [cookieString, setCookieString] = useState('');
  const initialParseRef = useRef(false);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      key: cookie?.key || '',
      value: cookie?.value || '',
      path: cookie?.path || '/',
      domain: domain || '',
      expires: cookie?.expires
        ? formatDateForInput(cookie.expires)
        : new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      secure: cookie?.secure || false,
      httpOnly: cookie?.httpOnly || false
    },
    validationSchema: Yup.object({
      key: Yup.string().required('Key is required'),
      value: Yup.string().required('Value is required'),
      domain: Yup.string(),
      secure: Yup.boolean(),
      httpOnly: Yup.boolean(),
      expires: Yup.date().min(new Date(), 'Expiration date must be in the future')
    }),
    onSubmit: (values) => {
      const modValues = {
        ...(cookie && { cookie }),
        ...values,
        expires: values.expires ? new Date(values.expires).getTime() : undefined
      };

      if (cookie) {
        dispatch(modifyCookie(domain, cookie, cookie.path, cookie.key, modValues))
          .then(() => {
            toast.success('Cookie modified successfully');
            onClose();
          })
          .catch((err) => {
            toast.error('An error occurred while modifying cookie');
            console.error(err);
          });
      } else {
        dispatch(addCookie(domain, modValues))
          .then(() => {
            toast.success('Cookie added successfully');
            onClose();
          })
          .catch((err) => {
            toast.error('An error occurred while adding cookie');
            console.error(err);
          });
      }
      onClose();
    }
  });

  const title = cookie ? 'Modify Cookie' : 'Add Cookie';

  const onSubmit = async () => {
    try {
      const cookieObj = await dispatch(getParsedCookie(cookieString));

      if (isRawMode) {
        if (!cookieObj) {
          toast.error('Failed to parse cookie string');
          return;
        }

        formik.setValues(
          (values) => ({
            ...values,
            ...cookieObj,
            expires: cookieObj.expires ? formatDateForInput(cookieObj.expires) : undefined
          }),
          true
        );
      }

      formik.handleSubmit();
    } catch (error) {
      toast.error('Failed to parse cookie string');
    }
  };

  useEffect(() => {
    const loadCookieString = async () => {
      if (cookie) {
        const str = await dispatch(createCookieString(cookie));

        setCookieString(str);
      }
      return '';
    };

    loadCookieString();
  }, [cookie]);

  // create the cookieString when raw mode is enabled
  useEffect(() => {
    if (isRawMode) {
      const createCookieStr = async () => {
        const str = await dispatch(createCookieString(formik.values));
        setCookieString(str);
      };

      createCookieStr();
    }
  }, [isRawMode]);

  useEffect(() => {
    // Reset the ref when raw mode changes
    if (isRawMode) {
      initialParseRef.current = false;
      return;
    }

    const setParsedCookie = async () => {
      if (!isRawMode && cookieString && !initialParseRef.current) {
        try {
          const cookieObj = await dispatch(getParsedCookie(cookieString));
          if (!cookieObj) return;

          initialParseRef.current = true;

          formik.setValues(
            (values) => ({
              ...values,
              ...cookieObj,
              expires: cookieObj?.expires ? formatDateForInput(cookieObj.expires) : undefined
            }),
            true
          );
        } catch (error) {
          toast.error('Failed to parse cookie string');
        }
      }
    };

    setParsedCookie();
  }, [isRawMode, cookieString, dispatch, formik]);

  return (
    <Modal
      size="lg"
      title={title}
      onClose={onClose}
      handleCancel={onClose}
      handleConfirm={onSubmit}
      customHeader={
        <div className="flex items-center justify-between w-full">
          <h2 className="text-sm font-bold">{title}</h2>
          <div className="ml-auto flex items-center ">
            <label className="text-sm font-normal mr-2" style={{ textTransform: 'none' }}>
              Raw Mode
            </label>
            <ToggleSwitch
              className="mr-2"
              isOn={isRawMode}
              handleToggle={(e) => {
                setIsRawMode(e.target.checked);
              }}
            />
          </div>
        </div>
      }
    >
      <form onSubmit={(e) => e.preventDefault()} className="p-6">
        {isRawMode ? (
          <div>
            <label className="block text-sm mb-1">Cookie String</label>
            <textarea
              value={cookieString}
              onChange={(e) => setCookieString(e.target.value)}
              className="block textbox w-full h-24"
              placeholder="key=value; key2=value2"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Key</label>
                <input
                  type="text"
                  name="key"
                  value={formik.values.key}
                  onChange={formik.handleChange}
                  className="block textbox non-passphrase-input w-full"
                />
                {formik.touched.key && formik.errors.key && (
                  <div className="text-red-500 text-sm mt-1">{formik.errors.key}</div>
                )}
              </div>

              <div>
                <label className="block text-sm mb-1">Value</label>
                <input
                  type="text"
                  name="value"
                  value={formik.values.value}
                  onChange={formik.handleChange}
                  className="block textbox non-passphrase-input w-full"
                />
                {formik.touched.value && formik.errors.value && (
                  <div className="text-red-500 text-sm mt-1">{formik.errors.value}</div>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1">Domain</label>
                <input
                  type="text"
                  name="domain"
                  value={formik.values.domain}
                  onChange={formik.handleChange}
                  className="block textbox non-passphrase-input w-full disabled:opacity-50"
                />
                {formik.touched.domain && formik.errors.domain && (
                  <div className="text-red-500 text-sm mt-1">{formik.errors.domain}</div>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1">Path</label>
                <input
                  type="text"
                  name="path"
                  value={formik.values.path}
                  onChange={formik.handleChange}
                  className="block textbox non-passphrase-input w-full"
                />
                {formik.touched.path && formik.errors.path && (
                  <div className="text-red-500 text-sm mt-1">{formik.errors.path}</div>
                )}
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-sm mb-1">Expiration (Select a future date)</label>
              <input
                type="datetime-local"
                name="expires"
                value={formik.values.expires}
                onChange={formik.handleChange}
                className="block textbox non-passphrase-input w-full"
              />
              {formik.touched.expires && formik.errors.expires && (
                <div className="text-red-500 text-sm mt-1">{formik.errors.expires}</div>
              )}
            </div>

            {/* Checkboxes */}
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="secure"
                  checked={formik.values.secure}
                  onChange={formik.handleChange}
                  className="mr-2"
                />
                <span className="text-sm">Secure</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="httpOnly"
                  checked={formik.values.httpOnly}
                  onChange={formik.handleChange}
                  className="mr-2"
                />
                <span className="text-sm">HTTP Only</span>
              </label>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default ModifyCookieModal;
