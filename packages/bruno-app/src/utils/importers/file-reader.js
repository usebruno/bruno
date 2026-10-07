import jsyaml from 'js-yaml';
import { BrunoError } from 'utils/common/error';

/**
 * Parse a File object as JSON or YAML and return the parsed object.
 * Throws with a user-friendly message on parse failure.
 */
export const parseFileAsJsonOrYaml = async (file) => {
  try {
    const text = await file.text();
    let parsed;
    if (file.name.toLowerCase().endsWith('.json')) {
      parsed = JSON.parse(text);
    } else {
      parsed = jsyaml.load(text);
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Document root must be an object');
    }
    return parsed;
  } catch {
    throw new Error('Failed to parse the file – ensure it is valid JSON or YAML');
  }
};

const readFile = (file) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed === null || typeof parsed !== 'object') {
          reject(new BrunoError('Unable to parse JSON'));
          return;
        }
        resolve({ fileName: file.name, filePath: file.path || file.webkitRelativePath || '', content: parsed });
      } catch (err) {
        reject(new BrunoError('Unable to parse JSON'));
      }
    };
    fileReader.onerror = () => reject(new BrunoError('Unable to read file'));
    fileReader.readAsText(file);
  });
};

export const readMultipleFiles = async (files) => {
  if (!files || files.length === 0) {
    throw new BrunoError('No files selected');
  }

  const parsedFiles = [];
  const invalidFiles = [];

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.json')) {
      invalidFiles.push({ fileName: file.name, error: 'Only JSON files are supported' });
      continue;
    }

    try {
      const parsedFile = await readFile(file);
      parsedFiles.push(parsedFile);
    } catch (err) {
      invalidFiles.push({ fileName: file.name, error: err.message });
    }
  }

  return { parsedFiles, invalidFiles };
};
