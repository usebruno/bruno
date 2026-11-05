const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { CopilotClient, RuntimeConnection, defineTool } = require('@github/copilot-sdk');

const COPILOT_MODEL_KIND = 'github-copilot-sdk';
const AUTO_MODEL_ID = 'auto';
const ASAR_SEGMENT = `${path.sep}app.asar${path.sep}`;
const UNPACKED_ASAR_SEGMENT = `${path.sep}app.asar.unpacked${path.sep}`;

const createCopilotModelRef = ({ token, modelId }) => ({ kind: COPILOT_MODEL_KIND, token, modelId });

const isCopilotModelRef = (model) => model?.kind === COPILOT_MODEL_KIND;

const resolvePackageRoot = (packageName) => (require.resolve.paths(packageName) || [])
  .map((base) => path.join(base, ...packageName.split('/')))
  .find((candidate) => fs.existsSync(path.join(candidate, 'package.json')));

const toUnpackedAsarPath = (filePath) => filePath.replace(ASAR_SEGMENT, UNPACKED_ASAR_SEGMENT);

const packagedRuntimePath = () => {
  if (!app.isPackaged) return null;
  const platform = `${process.platform}-${process.arch}`;
  const packageRoot = resolvePackageRoot(`@github/copilot-sdk-${platform}`);
  if (!packageRoot) return null;
  const wrapper = process.platform === 'win32' ? 'copilot-runtime.exe' : 'copilot-runtime';
  return toUnpackedAsarPath(path.join(packageRoot, 'prebuilds', platform, wrapper));
};

const parseRuntimeHttpError = (err) => {
  const message = typeof err?.message === 'string' ? err.message : '';
  const detailsStart = message.indexOf('{');
  if (detailsStart === -1) return null;
  try {
    const details = JSON.parse(message.slice(detailsStart));
    if (details?.kind !== 'http') return null;
    const body = String(details.body || '').trim();
    return { status: details.status, reason: body.split(': ').pop() || details.statusText || '' };
  } catch (parseError) {
    return null;
  }
};

const copilotRuntimeError = (err) => {
  const http = parseRuntimeHttpError(err);
  if (!http) return err instanceof Error ? err : new Error(String(err));
  if (http.status === 401 || http.status === 403) {
    const refused = new Error(`GitHub refused this token: ${http.reason}.`);
    refused.tokenRefused = true;
    return refused;
  }
  return new Error(`GitHub Copilot request failed: ${http.reason} (HTTP ${http.status})`);
};

const SESSION_ERROR_PREFIXES = {
  authentication: 'GitHub Copilot sign-in was refused',
  quota: 'You have reached your GitHub Copilot usage limit',
  rate_limit: 'GitHub Copilot is rate limiting requests'
};

const copilotSessionError = (data) => {
  const prefix = SESSION_ERROR_PREFIXES[data?.errorType] || 'GitHub Copilot error';
  return new Error(data?.message ? `${prefix}: ${data.message}` : prefix);
};

let runtime = null;

const stopCopilotRuntime = async () => {
  const current = runtime;
  runtime = null;
  if (!current) return;
  try {
    await current.ready;
  } catch (err) {
    return;
  }
  await current.client.stop();
};

const getCopilotClient = async (token) => {
  if (runtime?.token === token) return runtime.ready;
  await stopCopilotRuntime();

  const directory = path.join(app.getPath('userData'), 'copilot-sdk');
  fs.mkdirSync(directory, { recursive: true });
  const runtimePath = packagedRuntimePath();
  const client = new CopilotClient({
    gitHubToken: token,
    useLoggedInUser: false,
    mode: 'empty',
    logLevel: 'error',
    baseDirectory: directory,
    workingDirectory: directory,
    clientInfo: { applicationName: 'Bruno', applicationVersion: app.getVersion() },
    ...(runtimePath ? { connection: RuntimeConnection.forStdio({ path: runtimePath }) } : {})
  });
  const ready = client.start().then(() => client);
  const current = { token, client, ready };
  runtime = current;
  try {
    return await ready;
  } catch (err) {
    if (runtime === current) runtime = null;
    throw copilotRuntimeError(err);
  }
};

const toCatalogModel = (model) => {
  const multiplier = Number(model?.billing?.multiplier);
  return {
    modelId: model.id,
    label: model.name || model.id,
    multiplier: Number.isFinite(multiplier) ? multiplier : 1
  };
};

const AUTO_CATALOG_MODEL = { modelId: AUTO_MODEL_ID, label: 'Auto', multiplier: 1 };

const listCopilotModels = async (token) => {
  const client = await getCopilotClient(token);
  let result;
  try {
    result = await client.rpc.models.list({});
  } catch (err) {
    throw copilotRuntimeError(err);
  }
  const models = (Array.isArray(result?.models) ? result.models : [])
    .filter((model) => model?.id && model.id !== AUTO_MODEL_ID && model.policy?.state !== 'disabled')
    .map(toCatalogModel);
  return [AUTO_CATALOG_MODEL, ...models];
};

const toCopilotTools = (tools) => Object.entries(tools || {}).map(([name, tool]) => defineTool(name, {
  description: tool.description,
  parameters: tool.inputSchema,
  skipPermission: true,
  handler: async (args) => tool.execute(args ?? {})
}));

const contentText = (content) => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('');
  return content === null || content === undefined ? '' : JSON.stringify(content);
};

const speakerLabel = (role) => (role === 'assistant' ? 'Assistant' : 'User');

const buildCopilotPrompt = ({ messages, prompt }) => {
  if (!Array.isArray(messages) || messages.length === 0) return contentText(prompt);
  if (messages.length === 1) return contentText(messages[0].content);
  const earlier = messages.slice(0, -1).map((m) => `${speakerLabel(m.role)}:\n${contentText(m.content)}`).join('\n\n');
  const latest = messages[messages.length - 1];
  return `Conversation so far:\n\n${earlier}\n\n${speakerLabel(latest.role)}:\n${contentText(latest.content)}`;
};

const createPartQueue = () => {
  const parts = [];
  let finished = false;
  let wake = null;
  const notify = () => {
    if (wake) {
      wake();
      wake = null;
    }
  };
  return {
    push(part) {
      if (finished) return;
      parts.push(part);
      notify();
    },
    end() {
      finished = true;
      notify();
    },
    async* iterate() {
      while (true) {
        if (parts.length > 0) {
          yield parts.shift();
        } else if (finished) {
          return;
        } else {
          await new Promise((resolve) => {
            wake = resolve;
          });
        }
      }
    }
  };
};

const streamCopilotText = ({ model, system, messages, prompt, tools, abortSignal }) => {
  const queue = createPartQueue();
  let client = null;
  let session = null;

  const onAbort = () => {
    session?.abort().catch(() => {});
    queue.end();
  };

  const run = async () => {
    if (abortSignal?.aborted) return;
    abortSignal?.addEventListener('abort', onAbort, { once: true });

    client = await getCopilotClient(model.token);
    const copilotTools = toCopilotTools(tools);
    session = await client.createSession({
      model: model.modelId,
      streaming: true,
      tools: copilotTools,
      availableTools: copilotTools.length > 0 ? ['custom:*'] : [],
      onPermissionRequest: () => ({ kind: 'reject', feedback: 'Bruno only allows its own tools.' }),
      ...(system ? { systemMessage: { mode: 'replace', content: system } } : {})
    });
    if (abortSignal?.aborted) return;

    const toolNames = new Map();
    let streamedSinceLastMessage = false;
    const turnFinished = new Promise((resolve) => {
      session.on((event) => {
        const data = event?.data || {};
        switch (event?.type) {
          case 'assistant.message_delta':
            if (data.deltaContent) {
              streamedSinceLastMessage = true;
              queue.push({ type: 'text-delta', text: data.deltaContent });
            }
            break;
          case 'assistant.message':
            if (!streamedSinceLastMessage && data.content) {
              queue.push({ type: 'text-delta', text: data.content });
            }
            streamedSinceLastMessage = false;
            break;
          case 'tool.execution_start':
            toolNames.set(data.toolCallId, data.toolName);
            queue.push({ type: 'tool-call', toolName: data.toolName, input: data.arguments ?? {} });
            break;
          case 'tool.execution_complete':
            queue.push({ type: 'tool-result', toolName: toolNames.get(data.toolCallId) });
            break;
          case 'session.error':
            queue.push({ type: 'error', error: copilotSessionError(data) });
            resolve();
            break;
          case 'session.idle':
            resolve();
            break;
          default:
            break;
        }
      });
    });

    await session.send({ prompt: buildCopilotPrompt({ messages, prompt }) });
    await turnFinished;
  };

  run()
    .catch((err) => {
      if (!abortSignal?.aborted) queue.push({ type: 'error', error: copilotRuntimeError(err) });
    })
    .finally(() => {
      abortSignal?.removeEventListener('abort', onAbort);
      queue.end();
      if (session) {
        session.disconnect()
          .then(() => client.deleteSession(session.sessionId))
          .catch((err) => console.warn('[AI] Failed to clean up a Copilot session:', err.message));
      }
    });

  return { fullStream: queue.iterate() };
};

const generateCopilotText = async (args) => {
  let text = '';
  for await (const part of streamCopilotText(args).fullStream) {
    if (part.type === 'text-delta') text += part.text;
    if (part.type === 'error') throw part.error;
  }
  return { text };
};

module.exports = {
  AUTO_MODEL_ID,
  createCopilotModelRef,
  isCopilotModelRef,
  getCopilotClient,
  stopCopilotRuntime,
  listCopilotModels,
  streamCopilotText,
  generateCopilotText,
  buildCopilotPrompt,
  toUnpackedAsarPath
};
