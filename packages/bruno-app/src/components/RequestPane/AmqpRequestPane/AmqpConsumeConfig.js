import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { IconPlugConnected, IconPlugConnectedX, IconPlayerPlay, IconPlayerStop, IconTrash } from '@tabler/icons';
import { updateAmqpConsumeField, addAmqpSubscription, removeAmqpSubscription } from 'providers/ReduxStore/slices/collections';
import { getPropertyFromDraftOrRequest, findEnvironmentInCollection } from 'utils/collections/index';
import { uuid } from 'utils/common';

const AmqpConsumeConfig = ({ item, collection }) => {
  const dispatch = useDispatch();

  const exchange = getPropertyFromDraftOrRequest(item, 'request.consume.exchange') || '';
  const exchangeType = getPropertyFromDraftOrRequest(item, 'request.consume.exchangeType') || 'direct';
  const routingKey = getPropertyFromDraftOrRequest(item, 'request.consume.routingKey') || '';
  const queue = getPropertyFromDraftOrRequest(item, 'request.consume.queue') || '';
  const subscriptions = getPropertyFromDraftOrRequest(item, 'request.consume.subscriptions') || [];

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  // Maps an active subscription uid -> the resolved queue name it consumes from
  const [activeSubs, setActiveSubs] = useState({});

  const isSubActive = (sub) => Object.prototype.hasOwnProperty.call(activeSubs, sub.uid);

  const buildRequestPayload = useCallback(
    (extra = {}) => ({
      itemUid: item.uid,
      request: item.draft ? item.draft.request : item.request,
      collection,
      environment: findEnvironmentInCollection(collection, collection.activeEnvironmentUid),
      runtimeVariables: collection.runtimeVariables || {},
      settings: item.draft?.settings?.settings ?? item.settings?.settings ?? {},
      options: {},
      ...extra
    }),
    [item, collection]
  );

  const handleFieldChange = (field, value) => {
    dispatch(
      updateAmqpConsumeField({
        itemUid: item.uid,
        collectionUid: collection.uid,
        field,
        value
      })
    );
  };

  const handleAddSubscription = () => {
    if (!queue && !exchange) {
      toast.error('Set a queue name or an exchange first');
      return;
    }
    dispatch(
      addAmqpSubscription({
        itemUid: item.uid,
        collectionUid: collection.uid,
        subscription: {
          uid: uuid(),
          queue,
          exchange,
          exchangeType,
          routingKey
        }
      })
    );
    toast.success('Added to subscriptions');
  };

  // Connect to the broker and subscribe to every persisted queue in one action
  const handleConnect = async () => {
    try {
      setConnecting(true);
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:amqp:subscribe', buildRequestPayload());
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to connect');
      }
      setConnected(true);
      if (result?.subscribed?.length) {
        const next = {};
        result.subscribed.forEach((s) => {
          next[s.uid] = s.queue;
        });
        setActiveSubs((prev) => ({ ...prev, ...next }));
        toast.success(`Subscribed to ${result.subscribed.length} queue(s)`);
      } else {
        toast.success('AMQP connected');
      }
      if (result?.errors?.length) {
        toast.error(`${result.errors.length} subscription(s) failed`);
      }
    } catch (err) {
      toast.error(`AMQP connection error: ${err.message}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:amqp:disconnect', {
        itemUid: item.uid,
        collectionUid: collection.uid
      });
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to disconnect');
      }
      setConnected(false);
      setActiveSubs({});
      toast.success('AMQP disconnected');
    } catch (err) {
      toast.error(`Failed to disconnect AMQP: ${err.message}`);
    }
  };

  const handleSubscribeOne = async (sub) => {
    try {
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:amqp:subscribe', buildRequestPayload({ subscriptionUids: [sub.uid] }));
      if (result?.subscribed?.length) {
        setConnected(true);
        const { uid, queue: resolvedQueue } = result.subscribed[0];
        setActiveSubs((prev) => ({ ...prev, [uid]: resolvedQueue }));
        toast.success(`Subscribed to "${resolvedQueue}"`);
      } else {
        toast.error(`Failed to subscribe: ${result?.errors?.[0]?.error || 'unknown error'}`);
      }
    } catch (err) {
      toast.error(`Subscribe error: ${err.message}`);
    }
  };

  const handleUnsubscribeOne = async (sub) => {
    const resolvedQueue = activeSubs[sub.uid] || sub.queue;
    if (!resolvedQueue) return;
    try {
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:amqp:unsubscribe', {
        itemUid: item.uid,
        collectionUid: collection.uid,
        queue: resolvedQueue
      });
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to unsubscribe');
      }
      setActiveSubs((prev) => {
        const next = { ...prev };
        delete next[sub.uid];
        return next;
      });
      toast.success(`Unsubscribed from "${resolvedQueue}"`);
    } catch (err) {
      toast.error(`Unsubscribe error: ${err.message}`);
    }
  };

  const handleDeleteSubscription = async (sub) => {
    if (isSubActive(sub)) {
      await handleUnsubscribeOne(sub);
    }
    dispatch(
      removeAmqpSubscription({
        itemUid: item.uid,
        collectionUid: collection.uid,
        subscriptionUid: sub.uid
      })
    );
  };

  // Reflect any existing connection / consumers (e.g. connected from the URL bar)
  useEffect(() => {
    let cancelled = false;
    const { ipcRenderer } = window;
    ipcRenderer
      .invoke('renderer:amqp:connection-status', { itemUid: item.uid, collectionUid: collection.uid })
      .then((res) => {
        if (cancelled || !res?.success) return;
        setConnected(!!res.status?.connected);
        setActiveSubs(res.status?.consumingSubscriptions || {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.uid, collection.uid]);

  // Listen for AMQP events to keep connection + subscription state in sync
  useEffect(() => {
    const { ipcRenderer } = window;
    const isThis = (requestUid, collectionUid) => requestUid === item.uid && collectionUid === collection.uid;

    const handleConnected = (requestUid, collectionUid) => {
      if (isThis(requestUid, collectionUid)) setConnected(true);
    };
    const handleDisconnected = (requestUid, collectionUid) => {
      if (isThis(requestUid, collectionUid)) {
        setConnected(false);
        setActiveSubs({});
      }
    };
    const handleConsuming = (requestUid, collectionUid, data = {}) => {
      if (isThis(requestUid, collectionUid) && data.subscriptionUid != null) {
        setConnected(true);
        setActiveSubs((prev) => ({ ...prev, [data.subscriptionUid]: data.queue }));
      }
    };
    const handleConsumerStopped = (requestUid, collectionUid, data = {}) => {
      if (!isThis(requestUid, collectionUid)) return;
      setActiveSubs((prev) => {
        const next = { ...prev };
        if (data.subscriptionUid != null) {
          delete next[data.subscriptionUid];
        } else if (data.queue != null) {
          // Fallback: drop any uid mapped to this resolved queue
          Object.keys(next).forEach((uid) => {
            if (next[uid] === data.queue) delete next[uid];
          });
        }
        return next;
      });
    };

    const removeConnected = ipcRenderer.on('main:amqp:connected', handleConnected);
    const removeDisconnected = ipcRenderer.on('main:amqp:disconnected', handleDisconnected);
    const removeConsuming = ipcRenderer.on('main:amqp:consuming', handleConsuming);
    const removeConsumerStopped = ipcRenderer.on('main:amqp:consumer-stopped', handleConsumerStopped);

    return () => {
      removeConnected();
      removeDisconnected();
      removeConsuming();
      removeConsumerStopped();
    };
  }, [item.uid, collection.uid]);

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      <p className="text-xs opacity-50 mb-3">
        Define a queue binding below, then add it to your subscriptions. If an exchange is provided, the queue is
        bound to it using the routing key before consuming.
      </p>

      {/* Queue definition form */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium mb-1 opacity-70">Queue</label>
          <input
            type="text"
            data-testid="amqp-consume-queue-input"
            className="w-full px-2 py-1 text-sm border rounded"
            value={queue}
            onChange={(e) => handleFieldChange('queue', e.target.value)}
            placeholder="my-queue (leave empty for server-generated)"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-70">Exchange</label>
          <input
            type="text"
            data-testid="amqp-consume-exchange-input"
            className="w-full px-2 py-1 text-sm border rounded"
            value={exchange}
            onChange={(e) => handleFieldChange('exchange', e.target.value)}
            placeholder="my-exchange (optional)"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-70">Exchange Type</label>
          <select
            data-testid="amqp-consume-exchange-type-select"
            className="w-full px-2 py-1 text-sm border rounded"
            value={exchangeType}
            onChange={(e) => handleFieldChange('exchangeType', e.target.value)}
          >
            <option value="direct">direct</option>
            <option value="topic">topic</option>
            <option value="fanout">fanout</option>
            <option value="headers">headers</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-70">Routing Key</label>
          <input
            type="text"
            data-testid="amqp-consume-routing-key-input"
            className="w-full px-2 py-1 text-sm border rounded"
            value={routingKey}
            onChange={(e) => handleFieldChange('routingKey', e.target.value)}
            placeholder="my.routing.key (binding key)"
          />
        </div>
      </div>

      <div className="mb-4">
        <button
          data-testid="amqp-consume-add-subscription-button"
          className="px-3 py-1 text-xs font-medium rounded border hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={handleAddSubscription}
        >
          + Add to subscriptions
        </button>
      </div>

      {/* Connection controls */}
      <div className="flex items-center gap-2 mb-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
        <span className="flex items-center gap-1.5 text-xs font-medium mr-1" title={connected ? 'Connected to broker' : 'Not connected'}>
          <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
          {connected ? 'Connected' : 'Disconnected'}
        </span>
        {!connected ? (
          <button
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            onClick={handleConnect}
            disabled={connecting}
          >
            <IconPlugConnected size={14} strokeWidth={1.5} />
            {connecting ? 'Connecting…' : 'Connect & subscribe'}
          </button>
        ) : (
          <button
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700"
            onClick={handleDisconnect}
          >
            <IconPlugConnectedX size={14} strokeWidth={1.5} />
            Disconnect
          </button>
        )}
      </div>

      {/* Subscriptions list */}
      <div className="flex-1 min-h-0">
        <label className="block text-xs font-semibold mb-1 opacity-70 uppercase tracking-wide">
          Subscribed queues ({subscriptions.length})
        </label>
        <div className="border rounded text-xs">
          {subscriptions.length === 0 ? (
            <div className="text-center opacity-40 py-6">
              No subscriptions yet. Define a queue above and click "Add to subscriptions".
            </div>
          ) : (
            subscriptions.map((sub) => {
              const isActive = isSubActive(sub);
              return (
                <div
                  key={sub.uid}
                  className="flex items-center gap-2 px-2 py-1.5 border-b last:border-b-0"
                >
                  <span
                    className={`inline-block w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}
                    title={isActive ? 'Consuming' : 'Not consuming'}
                  />
                  <span className="font-medium truncate" title={sub.queue || '(server-generated)'}>
                    {sub.queue || '(server-generated)'}
                  </span>
                  {sub.exchange && (
                    <span className="opacity-50 truncate">
                      ex={sub.exchange}
                      {sub.routingKey ? ` key=${sub.routingKey}` : ''}
                    </span>
                  )}
                  <div className="flex items-center gap-1 ml-auto shrink-0">
                    {isActive ? (
                      <button
                        className="flex items-center gap-1 px-2 py-0.5 rounded border hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => handleUnsubscribeOne(sub)}
                        title="Unsubscribe (stop consuming this queue)"
                      >
                        <IconPlayerStop size={13} strokeWidth={1.5} /> Unsubscribe
                      </button>
                    ) : (
                      <button
                        className="flex items-center gap-1 px-2 py-0.5 rounded border hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                        onClick={() => handleSubscribeOne(sub)}
                        disabled={!connected}
                        title={connected ? 'Subscribe (start consuming this queue)' : 'Connect first'}
                      >
                        <IconPlayerPlay size={13} strokeWidth={1.5} /> Subscribe
                      </button>
                    )}
                    <button
                      className="flex items-center px-1.5 py-0.5 rounded border hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600"
                      onClick={() => handleDeleteSubscription(sub)}
                      title="Delete from list"
                    >
                      <IconTrash size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AmqpConsumeConfig;
