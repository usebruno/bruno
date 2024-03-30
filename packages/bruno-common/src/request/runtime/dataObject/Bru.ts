import interpolate from '../../../interpolate';

const variableNameRegex = /^[\w-.]*$/;

export class Bru {
  _nextRequest?: string;

  constructor(
    public envVariables: any,
    public collectionVariables: any,
    public processEnvVars: any,
    private collectionPath: any
  ) {}

  cwd() {
    return this.collectionPath;
  }

  getEnvName() {
    return this.envVariables.__name__;
  }

  getProcessEnv(key: string): unknown {
    return this.processEnvVars[key];
  }

  getEnvVar(key: string) {
    return interpolate(this.envVariables[key], this.processEnvVars);
  }

  setEnvVar(key: string, value: unknown) {
    if (!key) {
      throw new Error('Creating a env variable without specifying a name is not allowed.');
    }

    this.envVariables[key] = value;
  }

  setVar(key: string, value: unknown) {
    if (!key) {
      throw new Error('Creating a variable without specifying a name is not allowed.');
    }

    if (!variableNameRegex.test(key)) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters!` +
          ' Names must only contain alpha-numeric characters, "-", "_", "."'
      );
    }

    this.collectionVariables[key] = value;
  }

  getVar(key: string): unknown {
    if (!variableNameRegex.test(key)) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters!` +
          ' Names must only contain alpha-numeric characters, "-", "_", "."'
      );
    }

    return this.collectionVariables[key];
  }

  setNextRequest(nextRequest: string) {
    this._nextRequest = nextRequest;
  }
}
