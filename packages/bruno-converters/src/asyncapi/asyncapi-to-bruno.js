import jsyaml from 'js-yaml';
import { hydrateSeqInCollection, uuid, validateSchema } from '../common/index.js';

const resolvePointer = (spec, ref) => {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return null;
  return ref.slice(2).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~')).reduce((value, key) => value?.[key], spec);
};

const dereference = (value, spec, seen = new Set()) => {
  if (Array.isArray(value)) return value.map((item) => dereference(item, spec, seen));
  if (!value || typeof value !== 'object') return value;
  if (value.$ref) {
    if (seen.has(value.$ref)) return {};
    const target = resolvePointer(spec, value.$ref);
    if (!target) return {};
    const nextSeen = new Set(seen).add(value.$ref);
    return dereference({ ...target, ...Object.fromEntries(Object.entries(value).filter(([key]) => key !== '$ref')) }, spec, nextSeen);
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, dereference(child, spec, seen)]));
};

const toText = (value) => typeof value === 'string' ? value : JSON.stringify(value, null, 2);

const exampleFromSchema = (schema, depth = 0) => {
  if (!schema || typeof schema !== 'object' || depth > 5) return undefined;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  if (schema.type === 'object' || schema.properties) {
    return Object.fromEntries(Object.entries(schema.properties || {}).map(([name, property]) => [name, exampleFromSchema(property, depth + 1)]).filter(([, value]) => value !== undefined));
  }
  if (schema.type === 'array') {
    const item = exampleFromSchema(schema.items, depth + 1);
    return item === undefined ? [] : [item];
  }
  if (schema.type === 'integer' || schema.type === 'number') return 0;
  if (schema.type === 'boolean') return false;
  if (schema.type === 'string') return '';
  return undefined;
};

const exampleFromMessage = (message, spec) => {
  const resolved = dereference(message || {}, spec);
  const example = resolved.examples?.[0];
  if (example?.payload !== undefined) return example.payload;
  if (resolved.payload?.example !== undefined) return resolved.payload.example;
  if (resolved.payload?.default !== undefined) return resolved.payload.default;
  return exampleFromSchema(resolved.payload);
};

const messageContentType = (operation, spec) => {
  const messages = Array.isArray(operation?.messages) ? operation.messages : operation?.message ? [operation.message] : [];
  for (const message of messages) {
    const resolved = dereference(message || {}, spec);
    if (resolved.contentType) return resolved.contentType;
  }
  return '';
};

const normalizeName = (value, fallback) => String(value || fallback).trim().replace(/[\\/:*?"<>|]/g, '_') || fallback;

const messageForOperation = (operation, spec) => {
  const messages = Array.isArray(operation?.messages) ? operation.messages : operation?.message ? [operation.message] : [];
  for (const message of messages) {
    const payload = exampleFromMessage(message, spec);
    if (payload !== undefined) return payload;
  }
  return undefined;
};

const serverUrl = (server, spec) => {
  const resolved = dereference(server || {}, spec);
  if (!resolved.url) return '';
  const url = String(resolved.url).replace(/\{([^}]+)\}/g, '{{$1}}');
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(url)) return url;
  const protocol = resolved.protocol || 'http';
  return `${protocol}://${url}`;
};

const buildEnvironments = (servers = {}) => Object.entries(servers).flatMap(([name, rawServer]) => {
  const variables = Object.entries(rawServer?.variables || {}).map(([variableName, variable]) => ({
    uid: uuid(), name: variableName, value: String(variable.default ?? variable.enum?.[0] ?? ''), type: 'text', enabled: true, secret: false
  }));
  return variables.length ? [{ uid: uuid(), name: normalizeName(name, 'Server'), variables }] : [];
});

const operationForV2 = (action, channel, address, spec) => ({
  action,
  channel,
  address,
  operation: channel[action],
  binding: channel.bindings?.http || channel.bindings?.ws || channel.bindings?.websocket,
  protocol: channel.bindings?.http ? 'http' : channel.bindings?.ws || channel.bindings?.websocket ? 'ws' : null,
  messages: channel[action]?.message ? [channel[action].message] : []
});

const channelAddress = (channel) => channel.address ?? channel['x-parser-unique-object-id'] ?? '';

const makeHttpRequest = ({ operation, address, baseUrl, protocol, spec }) => {
  const binding = operation.binding || {};
  const method = String(binding.method || (['publish', 'send'].includes(operation.action) ? 'POST' : 'GET')).toUpperCase();
  const headers = Object.entries(binding.headers || {}).map(([name, value]) => ({ uid: uuid(), name, value: String(value), enabled: true }));
  const query = Object.entries(binding.query || {}).map(([name, value]) => ({ uid: uuid(), name, value: String(value?.example ?? value?.default ?? ''), type: 'query', enabled: true }));
  const pathParams = Object.entries(operation.channel?.parameters || {}).map(([name, parameter]) => ({
    uid: uuid(), name, value: String(parameter?.enum?.[0] ?? parameter?.default ?? parameter?.example ?? ''), type: 'path', enabled: true
  }));
  const message = messageForOperation(operation, spec);
  const body = { mode: 'none' };
  if (message !== undefined) {
    const contentType = messageContentType(operation, spec);
    if (typeof message === 'string' && contentType.startsWith('text/')) {
      body.mode = 'text';
      body.text = message;
    } else {
      body.mode = 'json';
      body.json = JSON.stringify(message, null, 2);
    }
    if (contentType && !headers.some((header) => header.name.toLowerCase() === 'content-type')) {
      headers.push({ uid: uuid(), name: 'Content-Type', value: contentType, enabled: true });
    }
  }
  const server = baseUrl || `${protocol || 'https'}://{{host}}`;
  const request = {
    uid: uuid(), type: 'http-request', name: normalizeName(operation.operation?.operationId || operation.operation?.title || `${operation.action} ${operation.address}`, 'Request'),
    description: operation.operation?.description || '',
    request: {
      url: `${server.replace(/\/$/, '')}/${String(address).replace(/^\//, '').replace(/\{([^}]+)\}/g, ':$1')}`,
      method, headers, params: [...pathParams, ...query], auth: { mode: 'inherit' }, body,
      script: { req: '', res: '' }, vars: { req: [], res: [] }, docs: operation.operation?.description || ''
    }
  };
  return request;
};

const makeWebSocketRequest = ({ operation, address, baseUrl, spec }) => {
  const wsUrl = (baseUrl || 'ws://{{host}}').replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
  const messages = [];
  const resolvedMessages = (operation.messages || []).map((message) => dereference(message, spec));
  resolvedMessages.forEach((message, index) => {
    const payload = exampleFromMessage(message, spec);
    if (payload !== undefined) messages.push({ name: message.name || `message ${index + 1}`, type: typeof payload === 'string' ? 'text' : 'json', content: toText(payload) });
  });
  return {
    uid: uuid(), type: 'ws-request', name: normalizeName(operation.operation?.operationId || operation.operation?.title || `${operation.action} ${address}`, 'WebSocket'),
    description: operation.operation?.description || '',
    request: { url: `${wsUrl.replace(/\/$/, '')}/${String(address).replace(/^\//, '')}`, headers: [], auth: { mode: 'inherit' }, body: { mode: 'ws', ws: messages }, script: { req: '', res: '' }, vars: { req: [], res: [] }, docs: operation.operation?.description || '' }
  };
};

const buildOperations = (spec) => {
  if (String(spec.asyncapi).startsWith('3')) {
    return Object.entries(spec.operations || {}).map(([operationName, rawOperation]) => {
      const operation = dereference(rawOperation, spec);
      const channel = dereference(operation.channel, spec) || {};
      const channelAddressValue = channel.address || operation.channel?.$ref?.split('/').pop() || operationName;
      const serverKey = operation.servers?.[0]?.$ref?.split('/').pop();
      const channelServerKey = channel.servers?.[0]?.$ref?.split('/').pop();
      const server = serverKey
        ? spec.servers?.[serverKey]
        : channelServerKey ? spec.servers?.[channelServerKey] : Object.values(spec.servers || {})[0];
      const serverProtocol = String(server?.protocol || '').toLowerCase();
      const protocol = serverProtocol;
      const explicitBinding = operation.bindings?.http ? 'http' : operation.bindings?.ws || operation.bindings?.websocket ? 'ws' : null;
      return {
        action: operation.action || 'send', channel, address: channelAddressValue, operation,
        messages: operation.messages || [], serverProtocol, protocol: explicitBinding || (['http', 'https'].includes(protocol) ? 'http' : ['ws', 'wss', 'websocket'].includes(protocol) ? 'ws' : null),
        binding: operation.bindings?.http || operation.bindings?.ws || operation.bindings?.websocket,
        baseUrl: serverUrl(server, spec)
      };
    });
  }

  const serverMap = Object.fromEntries(Object.entries(spec.servers || {}).map(([name, server]) => [name, serverUrl(server, spec)]));
  return Object.entries(spec.channels || {}).flatMap(([address, rawChannel]) => {
    const channel = dereference(rawChannel, spec);
    const protocolNames = Object.keys(channel.bindings || {});
    const channelServers = channel.servers || Object.keys(serverMap);
    const serverName = typeof channelServers[0] === 'string' ? channelServers[0] : channelServers[0]?.$ref?.split('/').pop();
    const server = spec.servers?.[serverName] || Object.values(spec.servers || {})[0];
    const serverProtocol = String(server?.protocol || '').toLowerCase();
    const protocol = protocolNames.includes('http') || ['http', 'https'].includes(serverProtocol)
      ? 'http'
      : protocolNames.some((name) => ['ws', 'websocket'].includes(name)) || ['ws', 'wss', 'websocket'].includes(serverProtocol) ? 'ws' : null;
    const baseUrl = serverMap[serverName] || '';
    return ['publish', 'subscribe'].filter((action) => channel[action]).map((action) => ({ ...operationForV2(action, channel, address, spec), baseUrl, protocol, serverProtocol }));
  });
};

export const asyncApiToBruno = (input) => {
  const spec = typeof input === 'string' ? jsyaml.load(input) : input;
  if (!spec || typeof spec !== 'object' || !/^\s*\d+\./.test(String(spec.asyncapi || ''))) {
    throw new Error('Invalid AsyncAPI specification. Expected an asyncapi version.');
  }

  const itemsByChannel = new Map();
  const operations = buildOperations(spec);
  const unsupportedOperations = operations.filter((operation) => !['http', 'ws'].includes(operation.protocol));
  if (unsupportedOperations.length) {
    const names = unsupportedOperations.map((operation) => `${operation.action} ${operation.address}`).join(', ');
    throw new Error(`AsyncAPI import supports HTTP and WebSocket operations. These operations use unsupported broker protocols: ${names}`);
  }
  operations.forEach((operation) => {
    const item = operation.protocol === 'ws'
      ? makeWebSocketRequest(operation)
      : makeHttpRequest({ ...operation, protocol: operation.baseUrl?.startsWith('http://') ? 'http' : operation.baseUrl?.startsWith('https://') ? 'https' : operation.serverProtocol || 'https', spec });
    const channelName = normalizeName(operation.channel?.name || operation.address || 'Requests', 'Requests');
    if (!itemsByChannel.has(channelName)) itemsByChannel.set(channelName, []);
    itemsByChannel.get(channelName).push(item);
  });

  const items = Array.from(itemsByChannel, ([name, requests]) => ({ uid: uuid(), type: 'folder', name, items: requests }));
  if (!items.length) {
    throw new Error('No HTTP or WebSocket operations were found. MQTT, AMQP, Kafka, and other broker protocols are not supported by Bruno requests yet.');
  }

  const collection = {
    name: spec.info?.title?.trim() || 'AsyncAPI Collection', uid: uuid(), version: '1',
    items, environments: buildEnvironments(spec.servers), root: { request: { auth: { mode: 'none' }, headers: [], vars: { req: [], res: [] } }, meta: { name: spec.info?.title || 'AsyncAPI Collection' }, docs: spec.info?.description || '' }
  };
  return validateSchema(hydrateSeqInCollection(collection));
};

export default asyncApiToBruno;
