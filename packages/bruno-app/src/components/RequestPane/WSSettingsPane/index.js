import cn from 'classnames';
import Help from 'components/Help';
import SingleLineEditor from 'components/SingleLineEditor';
import Tooltip from 'ui/Tooltip';
import { useFormik } from 'formik';
import get from 'lodash/get';
import { updateItemSettings } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import StyledWrapper from './StyledWrapper';
import { AUTOCOMPLETE_TRIGGER } from 'utils/common/constants';

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
    timeout: isNaN(Number(connectionTimeout)) && ERRORS.timeout.invalid,
    keepAliveInterval: isNaN(Number(keepAliveInterval)) && ERRORS.keepAliveInterval.invalid
  };

  return (
    <StyledWrapper className="flex flex-col gap-4 w-full">
      <section className="grid gap-4 items-center grid-cols-2">
        <div>
          <label className="font-medium mb-2">Timeout</label>
          <Help placement="top" className="ml-2">
            <div>
              <p>
                <span>Timeout in milliseconds</span>
              </p>
            </div>
          </Help>
        </div>
        <div>
          <div className={cn('single-line-editor-wrapper', {
            error: formErrors.timeout
          })}
          >
            <Tooltip
              variant="error"
              content={formErrors.timeout}
            >
              <SingleLineEditor
                value={connectionTimeout}
                theme={storedTheme}
                onChange={(newValue) => updateSetting('timeout', newValue)}
                collection={collection}
                variableAutocomplete={AUTOCOMPLETE_TRIGGER.DOUBLE_BRACE}
              />
            </Tooltip>
          </div>
        </div>

        <div>
          <label className="font-medium mb-2">Keep Alive Interval</label>
          <Help placement="top" className="ml-2">
            <div>
              <p>
                <span>
                  Keep the websocket alive by sending ping requests to the server at every interval (in millseconds)
                </span>
              </p>
              <p className="mt-2">0 (zero) = off</p>
            </div>
          </Help>
        </div>
        <div>
          <div className={cn('single-line-editor-wrapper', {
            error: formErrors.keepAliveInterval
          })}
          >
            <Tooltip
              variant="error"
              content={formErrors.keepAliveInterval}
            >
              <SingleLineEditor
                value={keepAliveInterval}
                theme={storedTheme}
                onChange={(newValue) => updateSetting('keepAliveInterval', newValue)}
                collection={collection}
                variableAutocomplete={AUTOCOMPLETE_TRIGGER.DOUBLE_BRACE}
              />
            </Tooltip>
          </div>
        </div>
      </section>
    </StyledWrapper>
  );
};

export default WSSettingsPane;
