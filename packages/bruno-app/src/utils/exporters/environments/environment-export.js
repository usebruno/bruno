// Global Environment Exports
export const exportGlobalEnvironment = async (environment, filePath) => {
  try {
    const { ipcRenderer } = window;
    await ipcRenderer.invoke('renderer:export-global-environment', {
      environment,
      format: 'json',
      filePath
    });
  } catch (error) {
    console.error('Error exporting global environment as .json:', error);
    throw new Error('Failed to export global environment as .json file');
  }
};

// Collection Environment Exports
export const exportCollectionEnvironment = async (environment, filePath) => {
  try {
    const { ipcRenderer } = window;
    await ipcRenderer.invoke('renderer:export-collection-environment', {
      environment,
      format: 'json',
      filePath
    });
  } catch (error) {
    console.error('Error exporting collection environment as .json:', error);
    throw new Error('Failed to export collection environment as .json file');
  }
};
