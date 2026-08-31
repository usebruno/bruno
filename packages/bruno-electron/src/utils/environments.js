const fs = require('fs');
const path = require('path');
const { parseEnvironment, stringifyEnvironment } = require('@usebruno/filestore');
const { writeFile, withFileLock } = require('./filesystem');

/**
 * Rewrites the `extends` references that pointed at `oldName` before it was renamed to `newName`.
 * References are matched exactly, the way the inheritance resolver reads them, so a differently-cased
 * reference the resolver never followed is not claimed by this rename either.
 */
const renameEnvironmentExtendsReferences = async ({ environmentsDirPath, format, oldName, newName }) => {
  if (!fs.existsSync(environmentsDirPath)) {
    return;
  }

  const extension = `.${format}`;
  const fileNames = fs.readdirSync(environmentsDirPath).filter((fileName) => fileName.endsWith(extension));

  for (const fileName of fileNames) {
    const filePath = path.join(environmentsDirPath, fileName);

    await withFileLock(filePath, async () => {
      const environment = parseEnvironment(fs.readFileSync(filePath, 'utf8'), { format });

      if (environment.extends !== oldName) {
        return;
      }

      environment.extends = newName;
      environment.name = path.basename(fileName, extension);

      await writeFile(filePath, stringifyEnvironment(environment, { format }));
    });
  }
};

module.exports = {
  renameEnvironmentExtendsReferences
};
