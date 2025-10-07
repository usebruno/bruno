import cn from 'classnames';
import InfoTip from 'components/InfoTip/index';
import SingleLineEditor from 'components/SingleLineEditor';
import ToolHint from 'components/ToolHint/index';
import { useFormik } from 'formik';
import get from 'lodash/get';
import { updateItemSettings } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import StyledWrapper from './StyledWrapper';

/**
 * @param {string} propertyKey
 * @param {{draft?:Record<string,unknown>}} item
 * @returns
 */
const getPropertyFromDraftOrRequest = (propertyKey, item) =>
  item.draft ? get(item, `draft.${propertyKey}`, {}) : get(item, propertyKey, {});

const schema = Yup.object().shape({
  timeout: Yup.number('Timeout needs to be a valid number')
    .typeError('Timeout needs to be a valid number'),
  keepAliveInterval: Yup.number('Keep Alive Interval needs to be a valid number')
    .typeError('Keep Alive Interval needs to be a valid number')
});

const WSSettingsPane = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const requestPreferences = useSelector((state) => state.app.preferences.request);

  const { timeout: _connectionTimeout, keepAliveInterval = 0 } = getPropertyFromDraftOrRequest('settings', item);

  const connectionTimeout = _connectionTimeout ?? requestPreferences.timeout;

  const formik = useFormik({
    validationSchema: schema,
    validateOnChange: true,
    validateOnMount: true,
    enableReinitialize: true,
    initialValues: {
      timeout: connectionTimeout,
      keepAliveInterval
    }
  });

  useEffect(() => {
    if (formik.isValid) {
      dispatch(updateItemSettings({
        collectionUid: collection.uid,
        itemUid: item.uid,
        settings: { ...formik.values }
      }));
    }
  }, [formik.values.timeout, formik.values.keepAliveInterval, formik.isValid]);

  return (
    <StyledWrapper className="flex flex-col mt-4 gap-4 w-full">
      <section className="grid gap-4 items-center grid-cols-2">
        <div>
          <label className="font-medium mb-2">Timeout</label>
          <InfoTip
            infotipId="setting-connection-timeout"
            className="tooltip-mod max-w-lg"
            content={(
              <div>
                <p>
                  <span>Timeout in milliseconds</span>
                </p>
              </div>
            )}
          />
        </div>
        <div>
          <div className={cn('single-line-editor-wrapper', {
            error: formik.errors.timeout
          })}
          >
            <ToolHint
              key="timeout"
              toolhintId="ws-settings-timeout"
              place="top"
              text={formik.errors.timeout ? formik.errors.timeout : ''}
            >
              <SingleLineEditor
                value={formik.values.timeout}
                theme={storedTheme}
                onChange={(newValue) => formik.handleChange('timeout')(newValue)}
                collection={collection}
              />
            </ToolHint>
          </div>
        </div>

        <div>
          <label className="font-medium mb-2">Keep Alive Interval</label>
          <InfoTip
            infotipId="setting-keep-alive"
            className="tooltip-mod max-w-lg"
            content={(
              <div>
                <p>
                  <span>
                    Keep the websocket alive by sending ping requests to the server at every interval (in millseconds)
                  </span>
                </p>
                <p className="mt-2">0 (zero) = off</p>
              </div>
            )}
          />
        </div>
        <div>
          <div className={cn('single-line-editor-wrapper', {
            error: formik.errors.keepAliveInterval
          })}
          >
            <ToolHint
              key="timeout"
              toolhintId="ws-settings-keepAliveInterval"
              place="top"
              text={formik.errors.keepAliveInterval ? formik.errors.keepAliveInterval : ''}
            >
              <SingleLineEditor
                value={formik.values.keepAliveInterval}
                theme={storedTheme}
                onChange={(newValue) => formik.handleChange('keepAliveInterval')(newValue)}
                collection={collection}
              />
            </ToolHint>
          </div>
        </div>
      </section>
    </StyledWrapper>
  );
};

export default WSSettingsPane;
