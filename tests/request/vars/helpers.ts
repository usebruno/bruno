import * as fs from 'fs';
import yaml from 'js-yaml';

type SavedRequest = {
  runtime?: { variables?: { name: string; value?: string }[] };
};

/**
 * Read a pre-request variable's value straight from the saved request file.
 *
 * Returns undefined when the file can't be read or parsed yet: the app rewrites the
 * request on save, so a read racing that write can see a partial file. Callers poll
 * on this value, and `expect.poll` fails outright on a thrown error instead of
 * retrying — see `readExportedJson` in tests/utils/helpers.ts for the JSON twin.
 *
 * @param requestPath - Absolute path to the request's .yml file
 * @param varName - The variable name under `runtime.variables`
 * @returns The saved value, or undefined if the variable is not on disk yet
 */
export const readSavedRequestVar = async (requestPath: string, varName: string): Promise<string | undefined> => {
  try {
    const savedRequest = yaml.load(await fs.promises.readFile(requestPath, 'utf8')) as SavedRequest;
    return savedRequest?.runtime?.variables?.find((variable) => variable.name === varName)?.value;
  } catch {
    return undefined;
  }
};
