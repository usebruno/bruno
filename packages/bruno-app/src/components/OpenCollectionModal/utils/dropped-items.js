const isFolderItem = (item) => item.webkitGetAsEntry()?.isDirectory === true;

export const readDroppedItems = (dataTransfer, getFilePath) => {
  const fileItems = Array.from(dataTransfer.items).filter((item) => item.kind === 'file');
  const folderItems = fileItems.filter(isFolderItem);
  return {
    folderPaths: folderItems.map((item) => getFilePath(item.getAsFile())).filter(Boolean),
    hasFolders: folderItems.length > 0,
    fileCount: fileItems.length - folderItems.length
  };
};
