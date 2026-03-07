import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';

const MqttPublish = ({ item, collection }) => {
  const dispatch = useDispatch();

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

  const codeMirrorMode = payloadType === 'json' ? 'application/json' : payloadType === 'xml' ? 'application/xml' : 'text/plain';

  return (
    <StyledWrapper className="flex flex-col h-full gap-3 pt-2">
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

      <div className="flex items-center gap-2 px-1">
        <label className="text-xs font-medium">Payload</label>
        <select
          className="px-2 py-1 text-xs border rounded outline-none"
          value={payloadType}
          onChange={(e) => updatePublish({ payload: { ...publish?.payload, type: e.target.value } })}
        >
          <option value="json">JSON</option>
          <option value="text">Text</option>
          <option value="xml">XML</option>
          <option value="binary">Binary (Base64)</option>
        </select>

        <div className="flex-1" />
      </div>

      <div className="flex-1 px-1 overflow-hidden">
        <CodeEditor
          collection={collection}
          value={payloadContent}
          onEdit={(val) => updatePublish({ payload: { type: payloadType, content: val } })}
          mode={codeMirrorMode}
        />
      </div>
    </StyledWrapper>
  );
};

export default MqttPublish;
