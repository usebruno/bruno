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

// Collection Environment Exports
export const exportCollectionEnvironmentAsBru = async (environment, filePath) => {
  try {
    const { ipcRenderer } = window;
    await ipcRenderer.invoke('renderer:export-collection-environment', {
      environment,
      format: 'bru',
      filePath,
    });
  } catch (error) {
    console.error('Error exporting collection environment as .bru:', error);
    throw new Error('Failed to export collection environment as .bru file');
  }
};

export const exportCollectionEnvironmentAsJson = async (environment, filePath) => {
  try {
    const { ipcRenderer } = window;
    await ipcRenderer.invoke('renderer:export-collection-environment', {
      environment,
      format: 'json',
      filePath,
    });
  } catch (error) {
    console.error('Error exporting collection environment as .json:', error);
    throw new Error('Failed to export collection environment as .json file');
  }
};

export const exportCollectionEnvironments = async (collection, format = 'bru') => {
  try {
    const { ipcRenderer } = window;
    const result = await ipcRenderer.invoke('renderer:export-collection-environments', {
      collectionPath: collection.pathname,
      collectionName: collection.name,
      format,
    });

    return result;
  } catch (error) {
    console.error('Error exporting collection environments:', error);
    throw new Error('Failed to export collection environments');
  }
};
