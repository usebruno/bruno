const { cloneDeep } = require('lodash');
const { interpolate } = require('@usebruno/common');
const { uuid } = require('../../bruno-electron/src/utils/common');

const variableNameRegex = /^[\w-.]*$/;

const getVariablesKeyValuePairs = (variables) => {
  if (!variables) return variables;
  return variables?.reduce((acc, v) => {
    return {
      ...acc,
      [v?.name]: v?.value
    };
  }, {});
};

class Bru {
  constructor(
    envVariables,
    runtimeVariables,
    processEnvVars,
    collectionPath,
    resolvedRequestVariables,
    requestVariables,
    folderVariables,
    collectionVariables,
    currentFolderVariables
  ) {
    this.envVariables = envVariables || {};
    this.runtimeVariables = runtimeVariables || {};
    this.processEnvVars = cloneDeep(processEnvVars || {});
    this.requestVariables = requestVariables || {};
    this.folderVariables = folderVariables || [];
    this.currentFolderVariables = currentFolderVariables || [];
    this.collectionVariables = collectionVariables || {};
    this.resolvedRequestVariables = resolvedRequestVariables || {};
    this.collectionPath = collectionPath;
  }

  _interpolate = (str) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    const combinedVars = {
      processEnvVars: {
        process: {
          env: {
            ...this.processEnvVars
          }
        }
      },
      envVariables: { ...this.envVariables },
      collectionVariables: { ...getVariablesKeyValuePairs(this.collectionVariables) },
      folderVariables: [...this.folderVariables?.map((fv) => getVariablesKeyValuePairs(fv))],
      requestVariables: { ...getVariablesKeyValuePairs(this.requestVariables) },
      runtimeVariables: { ...this.runtimeVariables }
    };

    return interpolate(str, combinedVars);
  };

  cwd() {
    return this.collectionPath;
  }

  getEnvName() {
    return this.envVariables.__name__;
  }

  getProcessEnv(key) {
    return this.processEnvVars[key];
  }

  hasEnvVar(key) {
    return Object.hasOwn(this.envVariables, key);
  }

  getEnvVar(key) {
    return this._interpolate(this.envVariables[key]);
  }

  setEnvVar(key, value) {
    if (!key) {
      throw new Error('Creating a env variable without specifying a name is not allowed.');
    }

    this.envVariables[key] = value;
  }

  hasVar(key) {
    return Object.hasOwn(this.runtimeVariables, key);
  }

  setVar(key, value) {
    if (!key) {
      throw new Error('Creating a variable without specifying a name is not allowed.');
    }

    if (variableNameRegex.test(key) === false) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters!` +
          ' Names must only contain alpha-numeric characters, "-", "_", "."'
      );
    }

    this.runtimeVariables[key] = value;
  }

  getVar(key) {
    if (variableNameRegex.test(key) === false) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters!` +
          ' Names must only contain alpha-numeric characters, "-", "_", "."'
      );
    }

    return this._interpolate(this.runtimeVariables[key]);
  }

  deleteVar(key) {
    delete this.runtimeVariables[key];
  }

  getRequestVar(key) {
    return this.requestVariables?.findLast((v) => v?.name === key)?.value;
  }

  setRequestVar(key, value) {
    if (!key) {
      throw new Error('Creating a variable without specifying a name is not allowed.');
    }

    if (variableNameRegex.test(key) === false) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters!` +
          ' Names must only contain alpha-numeric characters, "-", "_", "."'
      );
    }

    let existingVar = false;
    this.requestVariables?.forEach((v) => {
      if (v?.name === key && value?.toString) {
        existingVar = true;
        v.value = value?.toString();
      }
    });
    if (!existingVar) {
      this.requestVariables?.push({
        name: key,
        value: value?.toString(),
        enabled: true,
        local: false,
        uid: uuid()
      });
    }
  }

  getFolderVar(key) {
    return this.currentFolderVariables?.findLast((v) => v?.name === key)?.value;
  }

  setFolderVar(key, value) {
    if (!key) {
      throw new Error('Creating a variable without specifying a name is not allowed.');
    }

    if (variableNameRegex.test(key) === false) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters!` +
          ' Names must only contain alpha-numeric characters, "-", "_", "."'
      );
    }

    let existingVar = false;
    this.currentFolderVariables?.forEach((v) => {
      if (v?.name === key && value?.toString) {
        existingVar = true;
        v.value = value?.toString();
      }
    });
    // if (!existingVar) {
    //   this.currentFolderVariables?.push({
    //     name: key,
    //     value: value?.toString(),
    //     enabled: true,
    //     local: false,
    //     uid: uuid()
    //   });
    // }
  }

  getCollectionVar(key) {
    return this.collectionVariables?.findLast((v) => v?.name === key)?.value;
  }

  setCollectionVar(key, value) {
    if (!key) {
      throw new Error('Creating a variable without specifying a name is not allowed.');
    }

    if (variableNameRegex.test(key) === false) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters!` +
          ' Names must only contain alpha-numeric characters, "-", "_", "."'
      );
    }

    let existingVar = false;
    this.collectionVariables?.forEach((v) => {
      if (v?.name === key && value?.toString) {
        existingVar = true;
        v.value = value?.toString();
      }
    });
    if (!existingVar) {
      this.collectionVariables?.push({
        name: key,
        value: value?.toString(),
        enabled: true,
        local: false,
        uid: uuid()
      });
    }
  }

  setNextRequest(nextRequest) {
    this.nextRequest = nextRequest;
  }

  resolveVar(key) {
    return null;
    // return this._interpolate(this.resolvedRequestVariables[key]);
  }
}

module.exports = Bru;
