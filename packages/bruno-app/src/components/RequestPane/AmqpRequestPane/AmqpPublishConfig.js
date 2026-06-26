import React from 'react';
import { useDispatch } from 'react-redux';
import { updateAmqpPublishField } from 'providers/ReduxStore/slices/collections';
import { getPropertyFromDraftOrRequest } from 'utils/collections/index';
import RequestBody from 'components/RequestPane/RequestBody';
import RequestBodyMode from 'components/RequestPane/RequestBody/RequestBodyMode';

const AmqpPublishConfig = ({ item, collection }) => {
  const dispatch = useDispatch();

  const exchange = getPropertyFromDraftOrRequest(item, 'request.publish.exchange') || '';
  const exchangeType = getPropertyFromDraftOrRequest(item, 'request.publish.exchangeType') || 'direct';
  const routingKey = getPropertyFromDraftOrRequest(item, 'request.publish.routingKey') || '';

  const handleFieldChange = (field, value) => {
    dispatch(
      updateAmqpPublishField({
        itemUid: item.uid,
        collectionUid: collection.uid,
        field,
        value
      })
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1 opacity-70">Exchange</label>
          <input
            type="text"
            data-testid="amqp-publish-exchange-input"
            className="w-full px-2 py-1 text-sm border rounded"
            value={exchange}
            onChange={(e) => handleFieldChange('exchange', e.target.value)}
            placeholder="my-exchange (optional)"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-70">Exchange Type</label>
          <select
            data-testid="amqp-publish-exchange-type-select"
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
            data-testid="amqp-publish-routing-key-input"
            className="w-full px-2 py-1 text-sm border rounded"
            value={routingKey}
            onChange={(e) => handleFieldChange('routingKey', e.target.value)}
            placeholder="my.routing.key"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium opacity-70">Message Body</label>
        <RequestBodyMode item={item} collection={collection} />
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <RequestBody item={item} collection={collection} />
      </div>
    </div>
  );
};

export default AmqpPublishConfig;
