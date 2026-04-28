import * as monaco from 'monaco-editor';
import { mockDataFunctions } from '@usebruno/common';
import { getAllVariables } from 'utils/collections';

const MOCK_DATA_HINTS = Object.keys(mockDataFunctions).map((key) => `$${key}`);

const VARIABLE_PATTERN = /\{\{([\w$.-]*)$/;

// ─── Variable Hints ─────────────────────────────────────────

const shouldSkipVariableKey = (key) => {
  return key === 'pathParams' || key === 'maskedEnvVariables' || key === 'process';
};

const transformVariablesToHints = (allVariables = {}) => {
  const hints = [];
  Object.keys(allVariables).forEach((key) => {
    if (!shouldSkipVariableKey(key)) {
      hints.push(key);
    }
  });
  if (allVariables.process && allVariables.process.env) {
    Object.keys(allVariables.process.env).forEach((key) => {
      hints.push(`process.env.${key}`);
    });
  }
  return hints;
};

const generateProgressiveHints = (fullHint) => {
  const parts = fullHint.split('.');
  const progressiveHints = [];
  for (let i = 1; i <= parts.length; i++) {
    progressiveHints.push(parts.slice(0, i).join('.'));
  }
  return progressiveHints;
};

// ─── Segment Extraction (matches CodeMirror logic) ──────────

const extractNextSegmentSuggestions = (filteredHints, currentInput) => {
  const prefixMatches = new Set();
  const substringMatches = new Set();
  const lowerInput = currentInput.toLowerCase();

  filteredHints.forEach((hint) => {
    const lowerHint = hint.toLowerCase();

    if (lowerHint.startsWith(lowerInput)) {
      if (lowerHint === lowerInput) {
        prefixMatches.add(hint.substring(hint.lastIndexOf('.') + 1));
        return;
      }

      const inputLength = currentInput.length;

      if (currentInput.endsWith('.')) {
        const afterDot = hint.substring(inputLength);
        const nextDot = afterDot.indexOf('.');
        const segment = nextDot === -1 ? afterDot : afterDot.substring(0, nextDot);
        prefixMatches.add(segment);
      } else {
        const lastDotInInput = currentInput.lastIndexOf('.');
        const currentSegmentStart = lastDotInInput + 1;
        const nextDotAfterInput = hint.indexOf('.', currentSegmentStart);
        const segment = nextDotAfterInput === -1
          ? hint.substring(currentSegmentStart)
          : hint.substring(currentSegmentStart, nextDotAfterInput);
        prefixMatches.add(segment);
      }
    } else if (lowerHint.includes(lowerInput)) {
      substringMatches.add(hint);
    }
  });

  return [...Array.from(prefixMatches).sort(), ...Array.from(substringMatches).sort()];
};

// ─── Build Hints ────────────────────────────────────────────

const buildVariableHints = (allVariables) => {
  const hints = new Set();
  MOCK_DATA_HINTS.forEach((h) => generateProgressiveHints(h).forEach((p) => hints.add(p)));
  transformVariablesToHints(allVariables).forEach((h) => generateProgressiveHints(h).forEach((p) => hints.add(p)));
  return Array.from(hints).sort();
};

// ─── Singleton Completion Provider ──────────────────────────
// Providers are registered once globally per language. Each editor
// registers/unregisters itself in the registry so the provider can
// resolve the correct collection and item for the active model.

const editorRegistry = new Map();
let providersRegistered = false;

const SUPPORTED_LANGUAGES = ['javascript', 'json', 'xml', 'html', 'yaml', 'plaintext', 'markdown', 'shell'];

const completionProvider = {
  triggerCharacters: ['{', '.', '$'],
  provideCompletionItems(model, position) {
    const entry = editorRegistry.get(model.uri.toString());
    if (!entry) {
      return { suggestions: [] };
    }

    const textUntilPosition = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });

    const variableMatch = textUntilPosition.match(VARIABLE_PATTERN);
    if (!variableMatch) {
      return { suggestions: [] };
    }

    const typed = variableMatch[1]; // text after {{
    // Convert 0-indexed string position to 1-indexed Monaco column
    const braceStartCol = textUntilPosition.lastIndexOf('{{') + 2 + 1;

    const collection = entry.getCollection();
    const item = entry.getItem();
    const allVariables = getAllVariables(collection, item);
    const { pathParams, maskedEnvVariables, ...varLookup } = allVariables;

    const allHints = buildVariableHints(varLookup);
    const filtered = allHints.filter((h) => h.toLowerCase().includes(typed.toLowerCase()));
    const segments = extractNextSegmentSuggestions(filtered, typed).slice(0, 50);

    // Determine replacement range — replace from last dot or from start of typed text
    let replaceStartCol;
    if (typed.endsWith('.')) {
      replaceStartCol = position.column;
    } else {
      const lastDot = typed.lastIndexOf('.');
      replaceStartCol = lastDot !== -1
        ? braceStartCol + lastDot + 1
        : braceStartCol;
    }

    const range = new monaco.Range(
      position.lineNumber,
      replaceStartCol,
      position.lineNumber,
      position.column
    );

    return {
      // incomplete: true tells Monaco to re-invoke the provider on each keystroke,
      // so suggestions update as the user types inside {{...}}
      incomplete: true,
      suggestions: segments.map((segment, i) => ({
        label: segment,
        kind: monaco.languages.CompletionItemKind.Variable,
        insertText: segment,
        range,
        sortText: String(i).padStart(4, '0')
      }))
    };
  }
};

const ensureProvidersRegistered = () => {
  if (providersRegistered) return;
  providersRegistered = true;
  SUPPORTED_LANGUAGES.forEach((lang) =>
    monaco.languages.registerCompletionItemProvider(lang, completionProvider)
  );
};

/**
 * Sets up variable autocomplete for the Monaco editor.
 * Providers are registered once globally (singleton); each editor instance
 * registers itself in a model-keyed registry so the shared provider can
 * resolve the correct collection/item context.
 *
 * Returns a dispose function.
 */
export const setupAutoComplete = (editor, collectionRef, itemRef) => {
  const getCollection = () => (typeof collectionRef === 'function' ? collectionRef() : collectionRef);
  const getItem = () => (typeof itemRef === 'function' ? itemRef() : itemRef);

  const modelUri = editor.getModel()?.uri.toString();
  if (modelUri) {
    editorRegistry.set(modelUri, { getCollection, getItem });
  }

  ensureProvidersRegistered();

  // Auto-trigger suggestions when typing inside {{...}}
  // This ensures the suggest widget opens regardless of language-specific quickSuggestions settings
  const contentChangeDisposable = editor.onDidChangeModelContent(() => {
    const position = editor.getPosition();
    if (!position) return;

    const model = editor.getModel();
    if (!model) return;

    const textUntilPosition = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });

    if (VARIABLE_PATTERN.test(textUntilPosition)) {
      editor.trigger('bruno-autocomplete', 'editor.action.triggerSuggest', {});
    }
  });

  return () => {
    if (modelUri) {
      editorRegistry.delete(modelUri);
    }
    contentChangeDisposable.dispose();
  };
};
