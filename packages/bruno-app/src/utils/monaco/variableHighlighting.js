import * as monaco from 'monaco-editor';
import get from 'lodash/get';
import { mockDataFunctions } from '@usebruno/common';
import { getAllVariables } from 'utils/collections';

const VARIABLE_REGEX = /\{\{([^}]*)\}\}/g;

const pathFoundInVariables = (path, obj) => {
  return get(obj, path) !== undefined;
};

/**
 * Applies decorations to highlight {{variable}} patterns in the editor.
 * Green for valid, red for invalid, blue for prompt variables.
 *
 * @param {monaco.editor.IStandaloneCodeEditor} editor
 * @param {Object} collection - Bruno collection object
 * @param {Object} item - Bruno request item object
 * @returns {Function} cleanup function
 */
export const setupVariableHighlighting = (editor, collection, item) => {
  let decorationIds = [];

  const updateDecorations = () => {
    const model = editor.getModel();
    if (!model) return;

    const variables = getAllVariables(collection, item);
    const { pathParams = {}, maskedEnvVariables = [], ...varLookup } = variables;
    const text = model.getValue();
    const newDecorations = [];

    let match;
    VARIABLE_REGEX.lastIndex = 0;

    while ((match = VARIABLE_REGEX.exec(text)) !== null) {
      const varName = match[1];
      const startOffset = match.index;
      const endOffset = startOffset + match[0].length;
      const startPos = model.getPositionAt(startOffset);
      const endPos = model.getPositionAt(endOffset);

      let className;
      if (varName.startsWith('?')) {
        className = 'bruno-variable-prompt';
      } else {
        const isMockVariable = varName.startsWith('$') && mockDataFunctions.hasOwnProperty(varName.substring(1));
        const isValid = isMockVariable || pathFoundInVariables(varName, varLookup);
        className = isValid ? 'bruno-variable-valid' : 'bruno-variable-invalid';
      }

      newDecorations.push({
        range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
        options: {
          inlineClassName: className,
          hoverMessage: { value: getHoverMessage(varName, varLookup, pathParams) }
        }
      });
    }

    decorationIds = editor.deltaDecorations(decorationIds, newDecorations);
  };

  // Initial decoration
  updateDecorations();

  // Update on content change
  const disposable = editor.onDidChangeModelContent(() => {
    updateDecorations();
  });

  return () => {
    disposable.dispose();
    // Clear decorations
    if (editor.getModel()) {
      decorationIds = editor.deltaDecorations(decorationIds, []);
    }
  };
};

/**
 * Generates a hover message for a variable.
 */
function getHoverMessage(varName, variables, pathParams) {
  if (varName.startsWith('?')) {
    return `**Prompt Variable**: \`${varName.substring(1)}\`\n\nUser will be prompted for this value at runtime.`;
  }

  if (varName.startsWith('$')) {
    const fnName = varName.substring(1);
    if (mockDataFunctions.hasOwnProperty(fnName)) {
      return `**Dynamic Variable**: \`${varName}\`\n\nGenerates a random/dynamic value at runtime.`;
    }
    return `**Unknown dynamic variable**: \`${varName}\``;
  }

  const value = get(variables, varName);
  if (value !== undefined) {
    const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    return `**Variable**: \`${varName}\`\n\n**Value**: \`${displayValue}\``;
  }

  // Check path params
  const pathValue = get(pathParams, varName);
  if (pathValue !== undefined) {
    return `**Path Parameter**: \`${varName}\`\n\n**Value**: \`${pathValue}\``;
  }

  return `**Undefined variable**: \`${varName}\``;
}

/**
 * Registers a hover provider for {{variable}} patterns.
 * This supplements the decoration hover with richer hover content.
 *
 * @param {Object} collection
 * @param {Object} item
 * @returns {monaco.IDisposable}
 */
export const registerVariableHoverProvider = (collection, item) => {
  return monaco.languages.registerHoverProvider('javascript', {
    provideHover(model, position) {
      const line = model.getLineContent(position.lineNumber);
      const matches = [...line.matchAll(/\{\{([^}]*)\}\}/g)];

      for (const match of matches) {
        const startCol = match.index + 1;
        const endCol = startCol + match[0].length;

        if (position.column >= startCol && position.column <= endCol) {
          const varName = match[1];
          const variables = getAllVariables(collection, item);
          const { pathParams = {}, maskedEnvVariables = [], ...varLookup } = variables;

          return {
            range: new monaco.Range(position.lineNumber, startCol, position.lineNumber, endCol),
            contents: [
              { value: getHoverMessage(varName, varLookup, pathParams) }
            ]
          };
        }
      }

      return null;
    }
  });
};
