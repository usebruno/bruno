import { translatePostmanScript } from '../postman-translations';

const TRANSLATION_FALLBACK_DESCRIPTIONS = {
  regex: 'regex replacement',
  verbatim: 'the original Postman script'
};

const translationFailureReporter = (issues, path) => ({ message, fallback }) => {
  issues.push({
    path,
    severity: 'warning',
    message: `Script translation fell back to ${TRANSLATION_FALLBACK_DESCRIPTIONS[fallback]}: ${message}`
  });
};

// Returns `translate(code, path)`, which records usage and reports any fallback as an issue at `path`.
export const createScriptTranslator = ({ preserveScripts, logTranslationFailures, issues, scriptUsages }) => (code, path) => {
  if (preserveScripts) {
    return Array.isArray(code) ? code.join('\n') : code;
  }

  const { translated, usage } = translatePostmanScript(code, {
    onTranslationFailure: translationFailureReporter(issues, path),
    logFailures: logTranslationFailures
  });
  if (usage) scriptUsages.push(usage);
  return translated;
};

// The translator worker only reads v2.1 events.
export const toWorkerEvents = ({ req, res }) => [
  ...(req ? [{ listen: 'prerequest', script: { exec: req } }] : []),
  ...(res ? [{ listen: 'test', script: { exec: res } }] : [])
];

const applyTranslatedScript = (request, translated) => {
  const { req, res } = translated.request?.script ?? {};
  request.script = {
    ...request.script,
    req: req || '',
    res: res || ''
  };
  request.tests = request.tests || '';
};

// `scriptMap` maps a Bruno item uid to `{ events }`; results are written back onto the matching items.
export const translateScriptsInWorkers = async (items, scriptMap, scriptUsages) => {
  try {
    const { default: scriptTranslationWorker } = await import('../../workers/postman-translator-worker');
    const { translatedScripts, scriptUsages: workerScriptUsages } = await scriptTranslationWorker(scriptMap);
    scriptUsages.push(...workerScriptUsages);

    const applyToItems = (brunoItems) => {
      brunoItems.forEach((item) => {
        const translated = translatedScripts.get(item.uid);
        if (item.type === 'folder') {
          if (translated) applyTranslatedScript(item.root.request, translated);
          applyToItems(item.items || []);
        } else if (translated) {
          applyTranslatedScript(item.request, translated);
        }
      });
    };

    applyToItems(items);
  } catch (error) {
    console.error('Error in script translation worker:', error);
  } finally {
    scriptMap.clear();
  }
};
