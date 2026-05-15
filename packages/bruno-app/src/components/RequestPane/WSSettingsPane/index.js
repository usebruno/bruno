import cn from 'classnames';
import InfoTip from 'components/InfoTip/index';
import SingleLineEditor from 'components/SingleLineEditor';
import ToolHint from 'components/ToolHint/index';
import { useFormik } from 'formik';
import get from 'lodash/get';
import { useTranslation } from 'react-i18next';
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

const ERRORS = {
  timeout: {
    invalid: `Timeout needs to be a valid number`
  },
  keepAliveInterval: {
    invalid: `Timeout needs to be a valid number`
  }
};

const WSSettingsPane = ({ item, collection }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const requestPreferences = useSelector((state) => state.app.preferences.request);

  const { timeout: _connectionTimeout, keepAliveInterval = 0 } = getPropertyFromDraftOrRequest('settings', item);

  const connectionTimeout = _connectionTimeout ?? requestPreferences.timeout;

  const updateSetting = (key, value) => {
    dispatch(updateItemSettings({
      collectionUid: collection.uid,
      itemUid: item.uid,
      settings: {
        [key]: value
      }
    }));
  };

  const formErrors = {
    timeout: isNaN(Number(connectionTimeout)) && t('WS_SETTINGS.TIMEOUT_INVALID'),
    keepAliveInterval: isNaN(Number(keepAliveInterval)) && t('WS_SETTINGS.KEEP_ALIVE_INVALID')
  };

  return (
    <StyledWrapper className="flex flex-col gap-4 w-full">
      <section className="grid gap-4 items-center grid-cols-2">
        <div>
          <label className="font-medium mb-2">{t('WS_SETTINGS.TIMEOUT')}</label>
          <InfoTip
            infotipId="setting-connection-timeout"
            className="tooltip-mod max-w-lg"
            content={(
              <div>
                <p>
                  <span>{t('WS_SETTINGS.TIMEOUT_INFO')}</span>
                </p>
              </div>
            )}
          />
        </div>
        <div>
          <div className={cn('single-line-editor-wrapper', {
            error: formErrors.timeout
          })}
          >
            <ToolHint
              key="timeout"
              toolhintId="ws-settings-timeout"
              place="top"
              text={formErrors.timeout ? formErrors.timeout : ''}
            >
              <SingleLineEditor
                value={connectionTimeout}
                theme={storedTheme}
                onChange={(newValue) => updateSetting('timeout', newValue)}
                collection={collection}
              />
            </ToolHint>
          </div>
        </div>

        <div>
          <label className="font-medium mb-2">{t('WS_SETTINGS.KEEP_ALIVE')}</label>
          <InfoTip
            infotipId="setting-keep-alive"
            className="tooltip-mod max-w-lg"
            content={(
              <div>
                <p>
                  <span>
                    {t('WS_SETTINGS.KEEP_ALIVE_INFO')}
                  </span>
                </p>
                <p className="mt-2">{t('WS_SETTINGS.KEEP_ALIVE_ZERO')}</p>
              </div>
            )}
          />
        </div>
        <div>
          <div className={cn('single-line-editor-wrapper', {
            error: formErrors.keepAliveInterval
          })}
          >
            <ToolHint
              key="timeout"
              toolhintId="ws-settings-keepAliveInterval"
              place="top"
              text={formErrors.keepAliveInterval ? formErrors.keepAliveInterval : ''}
            >
              <SingleLineEditor
                value={keepAliveInterval}
                theme={storedTheme}
                onChange={(newValue) => updateSetting('keepAliveInterval', newValue)}
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
