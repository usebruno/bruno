/**
 * Migration utility to migrate brunoConfig.grpc to brunoConfig.protobuf
 * This ensures backward compatibility while transitioning to the new protobuf configuration structure
 */

const { cloneDeep } = require('lodash');

/**
 * Migrates grpc configuration to protobuf configuration
 * @param {Object} brunoConfig - The bruno configuration object
 * @returns {Object} - The migrated bruno configuration
 */
const migrateGrpcToProtobuf = (brunoConfig) => {
  if (!brunoConfig || typeof brunoConfig !== 'object') {
    return brunoConfig;
  }

  // Check if grpc config exists and protobuf config doesn't exist
  if (brunoConfig.grpc && !brunoConfig.protobuf) {
    console.log('Migrating brunoConfig.grpc to brunoConfig.protobuf');
    
    // Create a deep copy to avoid mutating the original
    const migratedConfig = cloneDeep(brunoConfig);
    
    // Copy grpc config to protobuf
    migratedConfig.protobuf = {
      ...migratedConfig.grpc
    };
    
    // Remove the old grpc config
    delete migratedConfig.grpc;
    
    console.log('Successfully migrated grpc config to protobuf');
    return migratedConfig;
  }
  
  // If both grpc and protobuf exist, merge them and prioritize protobuf
  if (brunoConfig.grpc && brunoConfig.protobuf) {
    console.log('Merging existing grpc and protobuf configs, prioritizing protobuf');
    
    const migratedConfig = cloneDeep(brunoConfig);
    
    // Merge arrays from both configs, prioritizing protobuf
    const mergedProtobuf = {
      ...migratedConfig.grpc,
      ...migratedConfig.protobuf,
      protoFiles: [
        ...(migratedConfig.grpc.protoFiles || []),
        ...(migratedConfig.protobuf.protoFiles || [])
      ],
      importPaths: [
        ...(migratedConfig.grpc.importPaths || []),
        ...(migratedConfig.protobuf.importPaths || [])
      ]
    };
    
    // Update protobuf config with merged data
    migratedConfig.protobuf = mergedProtobuf;
    
    // Remove the old grpc config
    delete migratedConfig.grpc;
    
    console.log('Successfully merged grpc and protobuf configs');
    return migratedConfig;
  }
  
  // No migration needed
  return brunoConfig;
};

/**
 * Checks if a brunoConfig needs migration
 * @param {Object} brunoConfig - The bruno configuration object
 * @returns {boolean} - True if migration is needed
 */
const needsMigration = (brunoConfig) => {
  return !!(brunoConfig && brunoConfig.grpc);
};

module.exports = {
  migrateGrpcToProtobuf,
  needsMigration
};
