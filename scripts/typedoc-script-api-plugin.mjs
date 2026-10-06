import { Application, Converter } from 'typedoc';

/**
 * TypeDoc plugin for the script API reference (typedoc.json).
 *
 * Registers the script API's custom block tags and rewrites their machine-readable values,
 * written for scripts/generate-script-api.js, as sentences for the reader:
 * - `@context pre-request tests` -> "Available in pre-request scripts and tests."
 * - `@runtime nodevm` -> "Developer Mode only: not available in Safe Mode."
 */

const CUSTOM_TAGS = ['@context', '@runtime'];

const CONTEXT_LABELS = {
  'pre-request': 'pre-request scripts',
  'post-response': 'post-response scripts',
  'tests': 'tests',
  'grpc:before-call-start': 'gRPC `beforeCallStart` hooks',
  'grpc:before-message-send': 'gRPC `beforeMessageSend` hooks',
  'grpc:after-message-receive': 'gRPC `afterMessageReceive` hooks',
  'grpc:after-call-end': 'gRPC `afterCallEnd` hooks'
};

const RUNTIME_LABELS = {
  nodevm: 'Developer Mode only: not available in Safe Mode.'
};

const listToSentence = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0]);

const textOf = (tag) => tag.content.map((part) => part.text).join('').trim();

const describeTag = (tag) => {
  const values = textOf(tag).split(/\s+/).filter(Boolean);
  if (tag.tag === '@context') {
    return `Available in ${listToSentence(values.map((value) => CONTEXT_LABELS[value] || value))}.`;
  }
  return values.map((value) => RUNTIME_LABELS[value] || value).join(' ');
};

// A comment can be reached from more than one reflection; each is rewritten once.
const rewritten = new WeakSet();

const rewriteComment = (comment) => {
  if (!comment || rewritten.has(comment)) return;
  rewritten.add(comment);
  for (const tag of comment.blockTags) {
    if (CUSTOM_TAGS.includes(tag.tag)) {
      tag.content = [{ kind: 'text', text: describeTag(tag) }];
    }
  }
};

/** @param {Application} app */
export function load(app) {
  app.on(Application.EVENT_BOOTSTRAP_END, () => {
    const blockTags = app.options.getValue('blockTags');
    app.options.setValue('blockTags', [...new Set([...blockTags, ...CUSTOM_TAGS])]);
  });

  app.converter.on(Converter.EVENT_RESOLVE_BEGIN, (context) => {
    for (const reflection of Object.values(context.project.reflections)) {
      rewriteComment(reflection.comment);
      for (const signature of reflection.signatures || []) {
        rewriteComment(signature.comment);
      }
    }
  });
}
