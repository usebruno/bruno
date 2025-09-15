import React from 'react';
import { Tooltip } from 'react-tooltip';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';

import SingleLineEditor from 'components/SingleLineEditor';
import { updateItemSettings } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme';

import ToggleSelector from '../Settings/ToggleSelector/index';
import StyledWrapper from './StyledWrapper';
import Accordion from 'components/Accordion';
import InfoTip from 'components/InfoTip/index';

/**
 * @param {string} propertyKey
 * @param {{draft?:Record<string,unknown>}} item
 * @returns
 */
const getPropertyFromDraftOrRequest = (propertyKey, item) =>
  item.draft ? get(item, `draft.${propertyKey}`, {}) : get(item, propertyKey, {});

const WSSettingsPane = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const { connectionTimeout, keepAliveInterval } = getPropertyFromDraftOrRequest('settings', item);

  const onChangeConnectionTimeout = (val) => {
    dispatch(
      updateItemSettings({
        collectionUid: collection.uid,
        itemUid: item.uid,
        settings: { connectionTimeout: val }
      })
    );
  };

  const onChangeKeepAliveInterval = (val) => {
    dispatch(
      updateItemSettings({
        collectionUid: collection.uid,
        itemUid: item.uid,
        settings: { keepAliveInterval: val }
      })
    );
  };

  return (
    <StyledWrapper className="flex flex-col mt-4 gap-4 w-full">
      <section className="grid gap-4 items-center grid-cols-2">
        <div>
          <label className="font-medium mb-2">Connection Timeout</label>
          <InfoTip
            infotipId="setting-connection-timeout"
            className="tooltip-mod max-w-lg"
            content={
              <div>
                <p>
                  <span>Timeout in milliseconds</span>
                </p>
              </div>
            }
          />
        </div>
        <div>
          <div className="single-line-editor-wrapper">
            <SingleLineEditor
              value={connectionTimeout}
              theme={storedTheme}
              onChange={(newValue) => onChangeConnectionTimeout(newValue)}
              collection={collection}
            />
          </div>
        </div>

        <div>
          <label className="font-medium mb-2">Keep Alive Interval</label>
          <InfoTip
            infotipId="setting-keep-alive"
            className="tooltip-mod max-w-lg"
            content={
              <div>
                <p>
                  <span>
                    Keep the websocket alive by sending ping requests to the server at every interval (in millseconds)
                  </span>
                </p>
                <p className="mt-2">0 (zero) = off</p>
              </div>
            }
          />
        </div>
        <div>
          <div className="single-line-editor-wrapper">
            <SingleLineEditor
              value={keepAliveInterval}
              theme={storedTheme}
              onChange={(newValue) => onChangeKeepAliveInterval(newValue)}
              collection={collection}
            />
          </div>
        </div>
      </section>
    </StyledWrapper>
  );
};

export default WSSettingsPane;
