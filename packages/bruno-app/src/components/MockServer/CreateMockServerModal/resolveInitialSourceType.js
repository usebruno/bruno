export const resolveInitialSourceType = ({
  editingInstance,
  hasDefaultCollection,
  hasDefaultSpec,
  defaultSourceType,
  hasCollectionOptions,
  hasSpecOptions
}) => {
  if (editingInstance) {
    return editingInstance.sourceType || 'manual';
  }
  if (hasDefaultCollection) {
    return 'collection';
  }
  if (hasDefaultSpec) {
    return 'spec';
  }
  if (defaultSourceType === 'spec' && hasSpecOptions) {
    return 'spec';
  }
  if (hasCollectionOptions) {
    return 'collection';
  }
  if (hasSpecOptions) {
    return 'spec';
  }
  return 'manual';
};
