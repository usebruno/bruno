const fs = require('node:fs');
const path = require('node:path');

const writeFileWithSuffix = async ({ dirname, basename, extension, createContent }) => {
  let counter = 0;

  while (true) {
    const name = counter === 0 ? basename : `${basename} (${counter})`;
    const filename = `${name}.${extension}`;
    const pathname = path.join(dirname, filename);
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
