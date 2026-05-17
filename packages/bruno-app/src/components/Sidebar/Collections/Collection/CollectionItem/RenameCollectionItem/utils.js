export const getRequestFileExtension = (itemFilename, collectionFormat) => {
  const filenameExtension = itemFilename?.match(/\.([^.\\/]+)$/)?.[1];

  if (filenameExtension) {
    return filenameExtension.toLowerCase();
  }

  return collectionFormat || 'bru';
};
