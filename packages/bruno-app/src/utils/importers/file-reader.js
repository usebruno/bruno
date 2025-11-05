import { BrunoError } from 'utils/common/error';

const readFile = (file) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        resolve({ fileName: file.name, content: parsed });
      } catch (err) {
        console.error(err);
        reject(new BrunoError(`Unable to parse JSON file: ${file.name}`));
      }
    };
    fileReader.onerror = (err) => reject(err);
    fileReader.readAsText(file);
  });
};

export const readMultipleFiles = async (files) => {
  if (!files || files.length === 0) {
    throw new BrunoError('No files selected');
  }

  const parsedFiles = [];

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.json')) {
      throw new BrunoError(`Invalid file type: ${file.name}. Only JSON files are supported.`);
    }

    try {
      const parsedFile = await readFile(file);
      parsedFiles.push(parsedFile);
    } catch (err) {
      throw new BrunoError(`Failed to read ${file.name}: ${err.message}`);
    }
  }

  return parsedFiles;
};
