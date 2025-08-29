import React from 'react';
import get from 'lodash/get';
import { findEnvironmentInCollection, getTreePathFromCollectionToItem } from 'utils/collections';

const FinalVarsTable = ({ item, collection }) => {
  // Get the complete variable resolution hierarchy
  const getResolvedVariables = () => {
    const requestTreePath = getTreePathFromCollectionToItem(collection, item);
    
    // Start with environment variables
    const activeEnvironment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
    const envVars = new Map();
    if (activeEnvironment) {
      activeEnvironment.variables.forEach(envVar => {
        if (envVar.enabled) {
          envVars.set(envVar.name, {
            value: envVar.value,
            source: `Environment: ${activeEnvironment.name}`,
            type: 'environment'
          });
        }
      });
    }

    // Add collection variables
    const collectionVars = get(collection, 'root.request.vars.req', []);
    collectionVars.forEach(_var => {
      if (_var.enabled) {
        envVars.set(_var.name, {
          value: _var.value,
          source: 'Collection',
          type: 'collection'
        });
      }
    });

    // Add folder variables (walking up the tree)
    for (let i of requestTreePath) {
      if (i.type === 'folder') {
        const folderVars = get(i, 'root.request.vars.req', []);
        folderVars.forEach(_var => {
          if (_var.enabled) {
            envVars.set(_var.name, {
              value: _var.value,
              source: `Folder: ${i.name}`,
              type: 'folder'
            });
          }
        });
      }
    }

    // Add request variables (highest priority)
    const requestVars = item.draft ? get(item, 'draft.request.vars.req', []) : get(item, 'request.vars.req', []);
    requestVars.forEach(_var => {
      if (_var.enabled) {
        envVars.set(_var.name, {
          value: _var.value,
          source: 'Request',
          type: 'request'
        });
      }
    });

    return Array.from(envVars, ([name, data]) => ({
      name,
      value: data.value,
      source: data.source,
      type: data.type
    }));
  };

  const finalVars = getResolvedVariables();

  const getTypeColor = (type) => {
    switch (type) {
      case 'environment': return 'text-green-600';
      case 'collection': return 'text-blue-600';
      case 'folder': return 'text-yellow-600';
      case 'request': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  if (!finalVars || finalVars.length === 0) {
    return (
      <div>
        <div className="text-gray-500 text-sm italic">No variables available</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left text-xs font-medium text-gray-700 py-2 px-1">Name</th>
            <th className="text-left text-xs font-medium text-gray-700 py-2 px-1">Value</th>
            <th className="text-left text-xs font-medium text-gray-700 py-2 px-1">Source</th>
          </tr>
        </thead>
        <tbody>
          {finalVars.map((variable, index) => (
            <tr key={`${variable.name}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-1 text-xs font-mono">{variable.name}</td>
              <td className="py-2 px-1 text-xs font-mono break-all">{variable.value}</td>
              <td className={`py-2 px-1 text-xs ${getTypeColor(variable.type)}`}>
                {variable.source}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FinalVarsTable;
