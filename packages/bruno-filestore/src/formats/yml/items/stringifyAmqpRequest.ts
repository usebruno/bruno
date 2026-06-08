import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import { stringifyYml } from '../utils';
import { isNonEmptyString } from '../../../utils';
import { toOpenCollectionAuth } from '../common/auth';
import { toOpenCollectionHttpHeaders } from '../common/headers';

const stringifyAmqpRequest = (item: BrunoItem): string => {
  try {
    const ocRequest: any = {};
    const brunoRequest = item.request as any;

    // info block
    const info: any = {
      name: isNonEmptyString(item.name) ? item.name : 'Untitled Request',
      type: 'amqp'
    };
    if (item.seq) {
      info.seq = item.seq;
    }
    if (item.tags?.length) {
      info.tags = item.tags;
    }
    ocRequest.info = info;

    // amqp block
    const amqp: any = {
      url: isNonEmptyString(brunoRequest?.url) ? brunoRequest.url : ''
    };

    // headers (sent with published messages)
    const headers = toOpenCollectionHttpHeaders(brunoRequest?.headers);
    if (headers) {
      amqp.headers = headers;
    }

    // publish config
    const publish = brunoRequest?.publish || {};
    const publishBlock: any = {};
    if (isNonEmptyString(publish.exchange)) {
      publishBlock.exchange = publish.exchange;
    }
    if (isNonEmptyString(publish.exchangeType)) {
      publishBlock.exchangeType = publish.exchangeType;
    }
    if (isNonEmptyString(publish.routingKey)) {
      publishBlock.routingKey = publish.routingKey;
    }
    if (Object.keys(publishBlock).length) {
      amqp.publish = publishBlock;
    }

    // consume config
    const consume = brunoRequest?.consume || {};
    const consumeBlock: any = {};
    if (isNonEmptyString(consume.exchange)) {
      consumeBlock.exchange = consume.exchange;
    }
    if (isNonEmptyString(consume.exchangeType)) {
      consumeBlock.exchangeType = consume.exchangeType;
    }
    if (isNonEmptyString(consume.routingKey)) {
      consumeBlock.routingKey = consume.routingKey;
    }
    if (isNonEmptyString(consume.queue)) {
      consumeBlock.queue = consume.queue;
    }
    if (Array.isArray(consume.subscriptions) && consume.subscriptions.length) {
      const subscriptions = consume.subscriptions
        .map((sub: any) => {
          const subBlock: any = {};
          if (isNonEmptyString(sub?.queue)) {
            subBlock.queue = sub.queue;
          }
          if (isNonEmptyString(sub?.exchange)) {
            subBlock.exchange = sub.exchange;
          }
          if (isNonEmptyString(sub?.exchangeType)) {
            subBlock.exchangeType = sub.exchangeType;
          }
          if (isNonEmptyString(sub?.routingKey)) {
            subBlock.routingKey = sub.routingKey;
          }
          return subBlock;
        })
        .filter((subBlock: any) => Object.keys(subBlock).length);
      if (subscriptions.length) {
        consumeBlock.subscriptions = subscriptions;
      }
    }
    if (Object.keys(consumeBlock).length) {
      amqp.consume = consumeBlock;
    }

    // auth
    const auth = toOpenCollectionAuth(brunoRequest?.auth);
    if (auth) {
      amqp.auth = auth;
    }

    // message body
    const bodyMode = brunoRequest?.body?.mode;
    if (bodyMode && bodyMode !== 'none') {
      const bodyContent = brunoRequest.body[bodyMode];
      if (bodyContent != null) {
        amqp.message = {
          type: bodyMode,
          data: bodyContent
        };
      }
    }

    ocRequest.amqp = amqp;

    // settings
    const amqpSettings = (item.settings as any)?.settings;
    if (amqpSettings) {
      ocRequest.settings = {};
      if (amqpSettings.timeout != null) {
        ocRequest.settings.timeout = Number(amqpSettings.timeout) || 0;
      }
      if (amqpSettings.heartbeat != null) {
        ocRequest.settings.heartbeat = Number(amqpSettings.heartbeat) || 0;
      }
      if (amqpSettings.prefetch != null) {
        ocRequest.settings.prefetch = Number(amqpSettings.prefetch) || 0;
      }
      if (isNonEmptyString(amqpSettings.vhost)) {
        ocRequest.settings.vhost = amqpSettings.vhost;
      }
    }

    // docs
    if (isNonEmptyString(brunoRequest?.docs)) {
      ocRequest.docs = brunoRequest.docs;
    }

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying AMQP request:', error);
    throw error;
  }
};

export default stringifyAmqpRequest;
