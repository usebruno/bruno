import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import { toBrunoAuth } from '../common/auth';
import { toBrunoHttpHeaders } from '../common/headers';
import { toBrunoScripts } from '../common/scripts';
import { toBrunoVariables } from '../common/variables';
import { uuid, ensureString } from '../../../utils';

const parseAmqpRequest = (ocRequest: any): BrunoItem => {
  const info = ocRequest.info;
  const amqp = ocRequest.amqp;
  const runtime = ocRequest.runtime;

  const brunoRequest: any = {
    url: ensureString(amqp?.url),
    publish: {
      exchange: ensureString(amqp?.publish?.exchange),
      exchangeType: ensureString(amqp?.publish?.exchangeType, 'direct'),
      routingKey: ensureString(amqp?.publish?.routingKey)
    },
    consume: {
      exchange: ensureString(amqp?.consume?.exchange),
      exchangeType: ensureString(amqp?.consume?.exchangeType, 'direct'),
      routingKey: ensureString(amqp?.consume?.routingKey),
      queue: ensureString(amqp?.consume?.queue),
      subscriptions: Array.isArray(amqp?.consume?.subscriptions)
        ? amqp.consume.subscriptions.map((sub: any) => ({
            uid: uuid(),
            queue: ensureString(sub?.queue),
            exchange: ensureString(sub?.exchange),
            exchangeType: ensureString(sub?.exchangeType, 'direct'),
            routingKey: ensureString(sub?.routingKey)
          }))
        : []
    },
    headers: toBrunoHttpHeaders(amqp?.headers) || [],
    auth: toBrunoAuth(amqp?.auth),
    body: { mode: 'json', json: '{}' },
    script: {
      req: null,
      res: null
    },
    vars: {
      req: [],
      res: []
    },
    assertions: [],
    tests: null,
    docs: null
  };

  // message
  if (amqp?.message) {
    const messageType = amqp.message.type || 'json';
    const messageData = ensureString(amqp.message.data);
    brunoRequest.body = { mode: messageType, [messageType]: messageData };
  }

  // scripts
  const scripts = toBrunoScripts(runtime?.scripts);
  if (scripts?.script && brunoRequest.script) {
    if (scripts.script.req) {
      brunoRequest.script.req = scripts.script.req;
    }
    if (scripts.script.res) {
      brunoRequest.script.res = scripts.script.res;
    }
  }
  if (scripts?.tests) {
    brunoRequest.tests = scripts.tests;
  }

  // variables
  const variables = toBrunoVariables(runtime?.variables);
  brunoRequest.vars = variables;

  // docs
  if (ocRequest.docs != null) {
    brunoRequest.docs = ensureString(ocRequest.docs);
  }

  // settings
  const amqpSettings: Record<string, number | string> = {
    timeout: 5000,
    heartbeat: 0,
    prefetch: 0,
    vhost: '/'
  };

  if (ocRequest.settings) {
    if (typeof ocRequest.settings.timeout === 'number') {
      amqpSettings.timeout = ocRequest.settings.timeout;
    }
    if (typeof ocRequest.settings.heartbeat === 'number') {
      amqpSettings.heartbeat = ocRequest.settings.heartbeat;
    }
    if (typeof ocRequest.settings.prefetch === 'number') {
      amqpSettings.prefetch = ocRequest.settings.prefetch;
    }
    if (typeof ocRequest.settings.vhost === 'string') {
      amqpSettings.vhost = ocRequest.settings.vhost;
    }
  }

  // bruno item
  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'amqp-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
    tags: info?.tags || [],
    request: brunoRequest as any,
    settings: { settings: amqpSettings } as any,
    fileContent: null,
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  return brunoItem;
};

export default parseAmqpRequest;
