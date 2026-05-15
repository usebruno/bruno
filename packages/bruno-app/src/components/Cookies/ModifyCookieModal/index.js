import React, { useState, useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from 'components/Modal/index';
import { modifyCookie, addCookie, getParsedCookie, createCookieString } from 'providers/ReduxStore/slices/app';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import ToggleSwitch from 'components/ToggleSwitch/index';
import { IconInfoCircle } from '@tabler/icons';
import moment from 'moment';
import 'moment-timezone';
import { Tooltip } from 'react-tooltip';
import { isEmpty } from 'lodash';
import { useTranslation } from 'react-i18next';
import StyledWrapper from './StyledWrapper';

const removeEmptyValues = (obj) => {
  return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== null && value !== undefined));
};

const ModifyCookieModal = ({ onClose, domain, cookie }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [isRawMode, setIsRawMode] = useState(false);
  const [cookieString, setCookieString] = useState('');
  const initialParseRef = useRef(false);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      ...(cookie ? cookie : {}),
      key: cookie?.key || '',
      value: cookie?.value || '',
      path: cookie?.path || '/',
      domain: cookie?.domain || domain || '',
      expires: cookie?.expires ? moment(cookie.expires).format(moment.HTML5_FMT.DATETIME_LOCAL) : '',
      secure: cookie?.secure || false,
      httpOnly: cookie?.httpOnly || false
    },
    validationSchema: Yup.object({
      key: Yup.string().required(t('MODIFY_COOKIE.KEY_REQUIRED')),
      value: Yup.string().required(t('MODIFY_COOKIE.VALUE_REQUIRED')),
      domain: Yup.string().required(t('MODIFY_COOKIE.DOMAIN_REQUIRED')),
      secure: Yup.boolean(),
      httpOnly: Yup.boolean(),
      expires: Yup.mixed()
        .nullable()
        .transform((value) => {
          if (!value || value === '') return null;
          return moment(value).isValid() ? moment(value).toDate() : null;
        })
        .test('future-date', t('MODIFY_COOKIE.EXPIRATION_FUTURE'), (value) => {
          if (!value) return true;
          return moment(value).isAfter(moment());
        })
    }),
    onSubmit: (values) => {
      const modValues = removeEmptyValues({
        ...(cookie ? cookie : {}),
        ...values,
        expires: values.expires
          ? moment(values.expires).isValid()
            ? moment(values.expires).toDate()
            : Infinity
          : Infinity
      });

      handleCookieDispatch(cookie, domain, modValues, onClose);
    }
  });

  const title = cookie ? t('MODIFY_COOKIE.MODIFY_COOKIE') : t('MODIFY_COOKIE.ADD_COOKIE');

  const handleCookieDispatch = (cookie, domain, modValues, onClose) => {
    if (cookie) {
      dispatch(modifyCookie(domain, cookie, modValues))
        .then(() => {
          toast.success(t('MODIFY_COOKIE.COOKIE_MODIFIED_SUCCESS'));
          onClose();
        })
        .catch((err) => {
          toast.error(t('MODIFY_COOKIE.MODIFY_ERROR'));
          console.error(err);
        });
    } else {
      dispatch(addCookie(domain, modValues))
        .then(() => {
          toast.success(t('MODIFY_COOKIE.COOKIE_ADDED_SUCCESS'));
          onClose();
        })
        .catch((err) => {
          toast.error(t('MODIFY_COOKIE.ADD_ERROR'));
          console.error(err);
        });
    }
  };

  const onSubmit = async () => {
    try {
      if (isRawMode) {
        const cookieObj = await dispatch(getParsedCookie(cookieString));

        const modifiedCookie = removeEmptyValues({
          ...formik.values,
          ...cookieObj,
          expires: cookieObj?.expires
            ? moment(cookieObj.expires).isValid()
              ? moment(cookieObj.expires).toDate()
              : Infinity
            : Infinity
        });

        if (!cookieObj) {
          toast.error(t('MODIFY_COOKIE.INVALID_COOKIE_STRING'));
          return;
        }

        const validationErrors = await formik.setValues(
          (values) => ({
            ...values,
            ...modifiedCookie,
            expires:
              modifiedCookie?.expires && moment(modifiedCookie.expires).isValid()
                ? moment(new Date(modifiedCookie.expires)).format(moment.HTML5_FMT.DATETIME_LOCAL)
                : ''
          }),
          true
        );

        if (!isEmpty(validationErrors)) {
          toast.error(Object.values(validationErrors).join('\n'));
          return;
        }

        handleCookieDispatch(cookie, domain, modifiedCookie, onClose);
      } else {
        formik.handleSubmit();
      }
    } catch (error) {
      const errMsg = error.message || t('MODIFY_COOKIE.PARSE_ERROR');
      toast.error(errMsg);
    }
  };

  useEffect(() => {
    if (!isRawMode) return;
    const loadCookieString = async () => {
      if (cookie) {
        const str = await dispatch(createCookieString(cookie));
        setCookieString(str);
      }
      return '';
    };

    loadCookieString();
  }, [cookie, isRawMode]);

  // create the cookieString when raw mode is enabled
  useEffect(() => {
    if (isRawMode) {
      const createCookieStr = async () => {
        const str = await dispatch(createCookieString(formik.values));
        setCookieString(str);
      };

      createCookieStr();
    }
  }, [isRawMode, formik.values]);

  useEffect(() => {
    // Reset the ref when raw mode changes
    if (isRawMode) {
      initialParseRef.current = false;
      return;
    }

    const setParsedCookie = async () => {
      if (!isRawMode && cookieString && !initialParseRef.current) {
        initialParseRef.current = true;

        try {
          const cookieObj = await dispatch(getParsedCookie(cookieString));

          if (!cookieObj) return;

          formik.setValues(
            (values) => ({
              ...values,
              ...removeEmptyValues(cookieObj),
              expires:
                cookieObj?.expires && moment(cookieObj.expires).isValid()
                  ? moment(new Date(cookieObj.expires)).format(moment.HTML5_FMT.DATETIME_LOCAL)
                  : ''
            }),
            true
          );
        } catch (error) {
          const errMsg = error.message || t('MODIFY_COOKIE.PARSE_ERROR');
          toast.error(errMsg);
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
      customHeader={(
        <div className="flex items-center justify-between w-full">
          <h2 className="font-bold">{title}</h2>
          <div className="ml-auto flex items-center ">
            <ToggleSwitch
              className="mr-2"
              isOn={isRawMode}
              size="2xs"
              handleToggle={(e) => {
                setIsRawMode(e.target.checked);
              }}
            />
            <label className="font-normal mr-4 normal-case">{t('MODIFY_COOKIE.EDIT_RAW')}</label>
          </div>
        </div>
      )}
    >
      <StyledWrapper>
        <form onSubmit={(e) => e.preventDefault()} className="px-2">
          {isRawMode ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block">{t('MODIFY_COOKIE.SET_COOKIE_STRING')}</label>
                <IconInfoCircle id="cookie-raw-info" size={16} strokeWidth={1.5} className="info-icon" />
                <Tooltip
                  anchorId="cookie-raw-info"
                  className="tooltip-mod"
                  html={t('MODIFY_COOKIE.IMMUTABLE_PROPERTIES_TOOLTIP')}
                />
              </div>
              <textarea
                value={cookieString}
                onChange={(e) => setCookieString(e.target.value)}
                className="block textbox w-full h-24"
                placeholder={t('MODIFY_COOKIE.COOKIE_STRING_PLACEHOLDER')}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">
                    {t('MODIFY_COOKIE.DOMAIN')}<span className="required-asterisk">*</span>{' '}
                  </label>
                  <input
                    type="text"
                    name="domain"
                    // Auto-focus if its add-new i.e. when domain prop is empty
                    autoFocus={!domain && !formik.values.domain}
                    value={formik.values.domain}
                    onChange={formik.handleChange}
                    className="block textbox non-passphrase-input w-full disabled:opacity-50"
                    disabled={!!cookie}
                  />
                  {formik.touched.domain && formik.errors.domain && (
                    <div className="error-message mt-1">{formik.errors.domain}</div>
                  )}
                </div>
                <div>
                  <label className="block mb-1">{t('MODIFY_COOKIE.PATH')}</label>
                  <input
                    type="text"
                    name="path"
                    value={formik.values.path}
                    onChange={formik.handleChange}
                    className="block textbox non-passphrase-input w-full disabled:opacity-50"
                    disabled={!!cookie}
                  />
                  {formik.touched.path && formik.errors.path && (
                    <div className="error-message mt-1">{formik.errors.path}</div>
                  )}
                </div>
                <div>
                  <label className="block mb-1">
                    {t('MODIFY_COOKIE.KEY')}<span className="required-asterisk">*</span>{' '}
                  </label>
                  <input
                    type="text"
                    name="key"
                    // Auto focus when add-for-domain i.e. if domain is already prefilled
                    autoFocus={!!domain && !formik.values.key}
                    value={formik.values.key}
                    onChange={formik.handleChange}
                    className="block textbox non-passphrase-input w-full disabled:opacity-50"
                    disabled={!!cookie}
                  />
                  {formik.touched.key && formik.errors.key && (
                    <div className="error-message mt-1">{formik.errors.key}</div>
                  )}
                </div>

                <div>
                  <label className="block mb-1">
                    {t('MODIFY_COOKIE.VALUE')}<span className="required-asterisk">*</span>{' '}
                  </label>
                  <input
                    type="text"
                    name="value"
                    // Auto-focus when its in edit mode i.e. cookie prop is present
                    autoFocus={!!cookie}
                    value={formik.values.value}
                    onChange={formik.handleChange}
                    className="block textbox non-passphrase-input w-full"
                  />
                  {formik.touched.value && formik.errors.value && (
                    <div className="error-message mt-1">{formik.errors.value}</div>
                  )}
                </div>
              </div>

              {/* Date Picker */}
              <div className="w-full flex items-end">
                <div>
                  <label className="block mb-1">{t('MODIFY_COOKIE.EXPIRATION')} ({moment.tz.guess()})</label>
                  <input
                    type="datetime-local"
                    name="expires"
                    value={formik.values.expires}
                    onChange={(e) => {
                      formik.handleChange(e);
                    }}
                    className="block textbox non-passphrase-input w-full"
                    min={moment().format(moment.HTML5_FMT.DATETIME_LOCAL)}
                  />
                  {formik.touched.expires && formik.errors.expires && (
                    <div className="error-message mt-1">{formik.errors.expires}</div>
                  )}
                </div>

                {/* Checkboxes */}
                <div className="flex space-x-4 ml-auto">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="secure"
                      checked={formik.values.secure}
                      onChange={formik.handleChange}
                      className="mr-2"
                    />
                    <span>{t('MODIFY_COOKIE.SECURE')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="httpOnly"
                      checked={formik.values.httpOnly}
                      onChange={formik.handleChange}
                      className="mr-2"
                    />
                    <span>{t('MODIFY_COOKIE.HTTP_ONLY')}</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </form>
      </StyledWrapper>
    </Modal>
  );
};

export default ModifyCookieModal;
