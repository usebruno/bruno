import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { subscribeMqtt, unsubscribeMqtt } from 'utils/network/index';
import { IconPlus, IconTrash, IconPlugConnected, IconPlugConnectedX } from '@tabler/icons';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const MqttSubscriptions = ({ item, collection }) => {
  const dispatch = useDispatch();

  const subscriptions = item.draft
    ? item.draft.request?.subscriptions || []
    : item.request?.subscriptions || [];

  const updateSubscriptions = useCallback((newSubs) => {
    dispatch(updateRequestBody({
      content: newSubs,
      itemUid: item.uid,
      collectionUid: collection.uid,
      contentType: 'mqtt-subscriptions'
    }));
  }, [dispatch, item.uid, collection.uid]);

  const addSubscription = useCallback(() => {
    updateSubscriptions([...subscriptions, { topic: '', qos: 0, enabled: false }]);
  }, [subscriptions, updateSubscriptions]);

  const removeSubscription = useCallback(async (index) => {
    const sub = subscriptions[index];
    if (sub.enabled && sub.topic) {
      try {
        await unsubscribeMqtt(item.uid, collection.uid, sub.topic);
      } catch (err) {
        toast.error('Failed to unsubscribe: ' + (err?.message || 'unknown error'));
        return;
      }
    }
    const newSubs = subscriptions.filter((_, i) => i !== index);
    updateSubscriptions(newSubs);
  }, [subscriptions, updateSubscriptions, item.uid, collection.uid]);

  const updateSubscription = useCallback((index, updates) => {
    const newSubs = subscriptions.map((sub, i) => {
      if (i !== index) return sub;
      return { ...sub, ...updates };
    });
    updateSubscriptions(newSubs);
  }, [subscriptions, updateSubscriptions]);

  const handleSubscribe = useCallback(async (index) => {
    const sub = subscriptions[index];
    if (!sub.topic) {
      toast.error('Please enter a topic first');
      return;
    }
    try {
      await subscribeMqtt(item.uid, collection.uid, sub.topic, sub.qos);
      updateSubscription(index, { enabled: true });
    } catch (err) {
      toast.error(err?.message || 'Failed to subscribe');
    }
  }, [subscriptions, updateSubscription, item.uid, collection.uid]);

  const handleUnsubscribe = useCallback(async (index) => {
    const sub = subscriptions[index];
    try {
      await unsubscribeMqtt(item.uid, collection.uid, sub.topic);
      updateSubscription(index, { enabled: false });
    } catch (err) {
      toast.error(err?.message || 'Failed to unsubscribe');
    }
  }, [subscriptions, updateSubscription, item.uid, collection.uid]);

  return (
    <StyledWrapper className="flex flex-col gap-2 pt-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium uppercase">Subscriptions</span>
        <button
          className="add-btn flex items-center gap-1 px-2 py-1 text-xs border rounded"
          onClick={addSubscription}
          data-testid="mqtt-add-subscription"
        >
          <IconPlus size={14} />
          Add
        </button>
      </div>

      {subscriptions.length === 0 && (
        <div className="empty-text text-sm px-1 py-4 text-center">
          No subscriptions yet. Click "Add" to subscribe to a topic.
        </div>
      )}

      {subscriptions.map((sub, index) => (
        <div key={index} className="sub-row flex items-center gap-2 px-1 py-1.5 border rounded">
          <input
            className="flex-1 px-2 py-1 text-sm border rounded outline-none"
            type="text"
            value={sub.topic}
            onChange={(e) => updateSubscription(index, { topic: e.target.value })}
            placeholder="sensor/# or alerts/+/critical"
            disabled={sub.enabled}
          />

          <select
            className="px-2 py-1 text-sm border rounded outline-none"
            value={sub.qos}
            onChange={(e) => updateSubscription(index, { qos: parseInt(e.target.value, 10) })}
            disabled={sub.enabled}
          >
            <option value={0}>QoS 0</option>
            <option value={1}>QoS 1</option>
            <option value={2}>QoS 2</option>
          </select>

          {sub.enabled ? (
            <button
              className="unsubscribe-btn flex items-center gap-1 px-2 py-1 text-xs font-medium rounded"
              onClick={() => handleUnsubscribe(index)}
              title="Unsubscribe from topic"
            >
              <IconPlugConnectedX size={14} />
              Unsub
            </button>
          ) : (
            <button
              className="subscribe-btn flex items-center gap-1 px-2 py-1 text-xs font-medium rounded"
              onClick={() => handleSubscribe(index)}
              title="Subscribe to topic"
              disabled={!sub.topic}
            >
              <IconPlugConnected size={14} />
              Sub
            </button>
          )}

          <button
            className="remove-btn p-1"
            aria-label="Remove subscription"
            onClick={() => removeSubscription(index)}
            title="Remove subscription"
          >
            <IconTrash size={16} />
          </button>
        </div>
      ))}

      <div className="help-text text-xs px-1 mt-1">
        Supports MQTT wildcards: <code>+</code> (single level) and <code>#</code> (multi level).
        Messages appear in the response pane after subscribing and connecting.
      </div>
    </StyledWrapper>
  );
};

export default MqttSubscriptions;
