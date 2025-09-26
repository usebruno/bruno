// Global Environment Exports
export const exportGlobalEnvironmentAsBru = async (environment, filePath) => {
  try {
    const { ipcRenderer } = window;
    await ipcRenderer.invoke('renderer:export-global-environment', {
      environment,
      format: 'bru',
      filePath,
    });
  } catch (error) {
    console.error('Error exporting global environment as .bru:', error);
    throw new Error('Failed to export global environment as .bru file');
  }
};

export const exportGlobalEnvironmentAsJson = async (environment, filePath) => {
  try {
    const { ipcRenderer } = window;
    await ipcRenderer.invoke('renderer:export-global-environment', {
      environment,
      format: 'json',
      filePath,
    });
  } catch (error) {
    console.error('Error exporting global environment as .json:', error);
    throw new Error('Failed to export global environment as .json file');
  }
};

export const exportGlobalEnvironments = async (format = 'json') => {
  try {
    const { ipcRenderer } = window;
    const result = await ipcRenderer.invoke('renderer:export-global-environments', {
      format,
    });

    return result;
  } catch (error) {
    console.error('Error exporting global environments:', error);
    throw new Error('Failed to export global environments');
  }
};

// Local Environment Exports
export const exportLocalEnvironmentAsBru = async (environment, filePath) => {
  try {
    const { ipcRenderer } = window;
    await ipcRenderer.invoke('renderer:export-local-environment', {
      environment,
      format: 'bru',
      filePath,
    });
  } catch (error) {
    console.error('Error exporting local environment as .bru:', error);
    throw new Error('Failed to export local environment as .bru file');
  }
};

export const exportLocalEnvironmentAsJson = async (environment, filePath) => {
  try {
    const { ipcRenderer } = window;
    await ipcRenderer.invoke('renderer:export-local-environment', {
      environment,
      format: 'json',
      filePath,
    });
  } catch (error) {
    console.error('Error exporting local environment as .json:', error);
    throw new Error('Failed to export local environment as .json file');
  }
};

export const exportLocalEnvironments = async (collection, format = 'bru') => {
  try {
    const { ipcRenderer } = window;
    const result = await ipcRenderer.invoke('renderer:export-local-environments', {
      collectionPath: collection.pathname,
      collectionName: collection.name,
      format,
    });

    return result;
  } catch (error) {
    console.error('Error exporting local environments:', error);
    throw new Error('Failed to export local environments');
  }
};
