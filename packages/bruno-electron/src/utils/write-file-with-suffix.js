const fs = require('node:fs');
const path = require('node:path');

const validatePathSegment = (value, label) => {
  const isInvalid = typeof value !== 'string'
    || !value
    || value === '.'
    || value === '..'
    || path.posix.isAbsolute(value)
    || path.win32.isAbsolute(value)
    || path.posix.basename(value) !== value
    || path.win32.basename(value) !== value;

  if (isInvalid) {
    throw new Error(`Invalid ${label}`);
  }
};

const writeFileWithSuffix = async ({ dirname, basename, extension, createContent }) => {
  validatePathSegment(basename, 'basename');
  validatePathSegment(extension, 'extension');

  let counter = 0;

  while (true) {
    const name = counter === 0 ? basename : `${basename} (${counter})`;
    const filename = `${name}.${extension}`;
    const pathname = path.join(dirname, filename);
    const relativePathname = path.relative(path.resolve(dirname), path.resolve(pathname));
    if (relativePathname === '..' || relativePathname.startsWith(`..${path.sep}`) || path.isAbsolute(relativePathname)) {
      throw new Error('Generated pathname must remain inside dirname');
    }
    const content = await createContent({ name, filename, pathname });

    try {
      await fs.promises.writeFile(pathname, content, { encoding: 'utf8', flag: 'wx' });
      return { pathname, name, filename };
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
      counter += 1;
    }
  }
};

module.exports = {
  writeFileWithSuffix
};
