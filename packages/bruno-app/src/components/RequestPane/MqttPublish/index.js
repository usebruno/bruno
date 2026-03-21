import React, { useCallback, useRef, forwardRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconWand, IconCaretDown } from '@tabler/icons';
import get from 'lodash/get';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme';
import { prettifyJsonString } from 'utils/common/index';
import { toastError } from 'utils/common/error';
import xmlFormat from 'xml-formatter';
import Dropdown from 'components/Dropdown';
import ToolHint from 'components/ToolHint/index';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';

const PAYLOAD_MODES = [
  { label: 'JSON', key: 'json' },
  { label: 'XML', key: 'xml' },
  { label: 'Text', key: 'text' },
  { label: 'Binary (Base64)', key: 'binary' }
];

const PAYLOAD_MODE_LABELS = {
  json: 'JSON',
  xml: 'XML',
  text: 'Text',
  binary: 'Binary'
};

const CODEMIRROR_MODES = {
  json: 'application/ld+json',
  xml: 'application/xml',
  text: 'application/text',
  binary: 'application/text'
};

const MqttPublish = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const dropdownTippyRef = useRef();

  const publish = item.draft ? item.draft.request?.publish : item.request?.publish;
  const topic = publish?.topic || '';
  const qos = publish?.qos ?? 0;
  const retain = publish?.retain ?? false;
  const payloadType = publish?.payload?.type || 'json';
  const payloadContent = publish?.payload?.content || '';

  const updatePublish = useCallback((updates) => {
    const currentPublish = item.draft ? item.draft.request?.publish : item.request?.publish;
    const newPublish = { ...currentPublish, ...updates };
    dispatch(updateRequestBody({
      content: newPublish,
      itemUid: item.uid,
      collectionUid: collection.uid,
      contentType: 'mqtt-publish'
    }));
  }, [dispatch, item, collection.uid]);

  const onPrettify = () => {
    if (payloadType === 'json') {
      try {
        const pretty = prettifyJsonString(payloadContent);
        updatePublish({ payload: { type: payloadType, content: pretty } });
      } catch (e) {
        toastError(new Error('Unable to prettify. Invalid JSON format.'));
      }
    }
    if (payloadType === 'xml') {
      try {
        const pretty = xmlFormat(payloadContent, { collapseContent: true });
        updatePublish({ payload: { type: payloadType, content: pretty } });
      } catch (e) {
        toastError(new Error('Unable to prettify. Invalid XML format.'));
      }
    }
  };

  const DropdownIcon = forwardRef((props, ref) => (
    <div ref={ref} className="flex items-center justify-center pl-3 py-1 select-none selected-body-mode">
      {PAYLOAD_MODE_LABELS[payloadType] || 'JSON'}
      <IconCaretDown className="caret ml-2" size={14} strokeWidth={2} />
    </div>
  ));

  return (
    <StyledWrapper className="flex flex-col h-full pt-2">
      <div className="flex items-center gap-3 px-1">
        <div className="flex-1">
          <label className="block text-xs font-medium mb-1">Topic</label>
          <input
            className="w-full px-2 py-1.5 text-sm border rounded outline-none"
            type="text"
            value={topic}
            onChange={(e) => updatePublish({ topic: e.target.value })}
            placeholder="sensor/temperature"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">QoS</label>
          <select
            className="px-2 py-1.5 text-sm border rounded outline-none"
            value={qos}
            onChange={(e) => updatePublish({ qos: parseInt(e.target.value) })}
          >
            <option value={0}>0 - At most once</option>
            <option value={1}>1 - At least once</option>
            <option value={2}>2 - Exactly once</option>
          </select>
        </div>

        <div className="flex items-end gap-1.5 pb-0.5">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={retain}
              onChange={(e) => updatePublish({ retain: e.target.checked })}
            />
            Retain
          </label>
        </div>
      </div>

      <div className="message-toolbar">
        <span className="message-label">Payload</span>
        <div className="toolbar-actions">
          <div className="inline-flex items-center cursor-pointer body-mode-selector">
            <Dropdown
              onCreate={(ref) => (dropdownTippyRef.current = ref)}
              icon={<DropdownIcon />}
              placement="bottom-end"
            >
              <div className="label-item font-medium">Format</div>
              {PAYLOAD_MODES.map((d) => (
                <div
                  className="dropdown-item"
                  key={d.key}
                  onClick={() => {
                    dropdownTippyRef.current.hide();
                    updatePublish({ payload: { ...publish?.payload, type: d.key } });
                  }}
                >
                  {d.label}
                </div>
              ))}
            </Dropdown>
          </div>

          <ToolHint text="Format" toolhintId="prettify-mqtt-payload">
            <button onClick={onPrettify} className="toolbar-btn">
              <IconWand size={16} strokeWidth={1.5} />
            </button>
          </ToolHint>
        </div>
      </div>

      <div className="flex-1 overflow-hidden editor-container">
        <CodeEditor
          collection={collection}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          value={payloadContent}
          onEdit={(val) => updatePublish({ payload: { type: payloadType, content: val } })}
          mode={CODEMIRROR_MODES[payloadType] ?? 'text/plain'}
          enableVariableHighlighting={true}
        />
      </div>
    </StyledWrapper>
  );
};

export default MqttPublish;
