import * as FileSaver from 'file-saver';
import { cloneDeep } from 'lodash';

// Remove secrets from environment variables for export
const removeSecretsFromVariables = (variables) => {
  return variables.map(variable => {
    const cleanVariable = { ...variable };
    if (cleanVariable.secret) {
      delete cleanVariable.value; // Remove secret values for security
    }
    return cleanVariable;
  });
};

// Prepare environment for export by removing sensitive data and UIDs
const prepareEnvironmentForExport = (environment) => {
  const envCopy = cloneDeep(environment);

  // Remove UIDs for clean export
  delete envCopy.uid;
  if (envCopy.variables) {
    envCopy.variables = envCopy.variables.map(variable => {
      const varCopy = { ...variable };
      delete varCopy.uid;
      return varCopy;
    });
  }

  // Remove secrets from variables
  if (envCopy.variables) {
    envCopy.variables = removeSecretsFromVariables(envCopy.variables);
  }

  return envCopy;
};

// Convert environment to .bru format manually
const environmentToBruContent = (environment) => {
  const lines = [];

  if (environment.variables && environment.variables.length > 0) {
    // Add regular variables
    const regularVars = environment.variables.filter(v => !v.secret);
    if (regularVars.length > 0) {
      lines.push('vars {');
      regularVars.forEach(variable => {
        if (variable.enabled !== false) {
          lines.push(`  ${variable.name}: ${variable.value || ''}`);
        } else {
          lines.push(`  ~${variable.name}: ${variable.value || ''}`);
        }
      });
      lines.push('}');
      lines.push('');
    }

    // Add secret variables (but without values for security)
    const secretVars = environment.variables.filter(v => v.secret);
    if (secretVars.length > 0) {
      lines.push('vars:secret [');
      secretVars.forEach(variable => {
        if (variable.enabled !== false) {
          lines.push(`  ${variable.name}`);
        } else {
          lines.push(`  ~${variable.name}`);
        }
      });
      lines.push(']');
    }
  }

  return lines.join('\n');
};

// Export single environment as .bru file
export const exportEnvironmentAsBru = (environment) => {
  try {
    const cleanEnvironment = prepareEnvironmentForExport(environment);
    const bruContent = environmentToBruContent(cleanEnvironment);
    const fileName = `${cleanEnvironment.name}.bru`;

    // Check if we're in test mode
    if (window.__BRUNO_TEST_MODE__) {
      // In test mode, return the BRU data directly instead of triggering file download
      return {
        fileName,
        content: bruContent,
        format: 'bru'
      };
    }

    const fileBlob = new Blob([bruContent], { type: 'text/plain' });
    FileSaver.saveAs(fileBlob, fileName);
  } catch (error) {
    console.error('Error exporting environment as .bru:', error);
    throw new Error('Failed to export environment as .bru file');
  }
};

// Export single environment as .json file
export const exportEnvironmentAsJson = (environment) => {
  try {
    const cleanEnvironment = prepareEnvironmentForExport(environment);
    const fileName = `${cleanEnvironment.name}.json`;

    // Check if we're in test mode
    if (window.__BRUNO_TEST_MODE__) {
      // In test mode, return the JSON data directly instead of triggering file download
      return {
        fileName,
        content: JSON.stringify(cleanEnvironment, null, 2),
        format: 'json'
      };
    }

    const fileBlob = new Blob([JSON.stringify(cleanEnvironment, null, 2)], { type: 'application/json' });
    FileSaver.saveAs(fileBlob, fileName);
  } catch (error) {
    console.error('Error exporting environment as .json:', error);
    throw new Error('Failed to export environment as .json file');
  }
};

// Export multiple environments as .json file
export const exportEnvironmentsAsJson = (environments, filename = 'environments') => {
  try {
    const cleanEnvironments = environments.map(prepareEnvironmentForExport);
    const fileName = `${filename}.json`;
    const fileBlob = new Blob([JSON.stringify(cleanEnvironments, null, 2)], { type: 'application/json' });
    FileSaver.saveAs(fileBlob, fileName);
  } catch (error) {
    console.error('Error exporting environments as .json:', error);
    throw new Error('Failed to export environments as .json file');
  }
};

// Export all global environments using backend file dialog
export const exportGlobalEnvironments = async (format = 'json') => {
  try {
    const { ipcRenderer } = window;
    const result = await ipcRenderer.invoke('renderer:export-global-environments', {
      format,
      testMode: window.__BRUNO_TEST_MODE__ || false
    });

    // In test mode, return the files data for validation
    if (window.__BRUNO_TEST_MODE__ && result && result.files) {
      return {
        files: result.files.map(file => ({
          fileName: file.fileName,
          content: file.content,
          format: file.format
        }))
      };
    }

    return result;
  } catch (error) {
    console.error('Error exporting global environments:', error);
    throw new Error('Failed to export global environments');
  }
};

// Export all global environments using frontend file saver (legacy)
export const exportGlobalEnvironmentsLegacy = (globalEnvironments, format = 'json') => {
  if (!globalEnvironments || globalEnvironments.length === 0) {
    throw new Error('No global environments to export');
  }

  if (format === 'json') {
    exportEnvironmentsAsJson(globalEnvironments, 'global-environments');
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }
};

// Export all local environments from a collection
export const exportLocalEnvironments = (environments, collectionName, format = 'json') => {
  if (!environments || environments.length === 0) {
    throw new Error('No local environments to export');
  }

  if (format === 'json') {
    const filename = `${collectionName}-environments`;
    exportEnvironmentsAsJson(environments, filename);
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }
};

// Export all local environments using backend file dialog
export const exportLocalEnvironmentsAll = async (collection, format = 'bru') => {
  try {
    const { ipcRenderer } = window;
    const result = await ipcRenderer.invoke('renderer:export-local-environments', {
      collectionPath: collection.pathname,
      collectionName: collection.name,
      format,
      testMode: window.__BRUNO_TEST_MODE__ || false
    });

    // In test mode, return the files data for validation
    if (window.__BRUNO_TEST_MODE__ && result && result.files) {
      return {
        files: result.files.map(file => ({
          fileName: file.fileName,
          content: file.content,
          format: file.format || format
        }))
      };
    }

    return result;
  } catch (error) {
    console.error('Error exporting local environments:', error);
    throw new Error('Failed to export local environments');
  }
};
