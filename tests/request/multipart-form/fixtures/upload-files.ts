import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const { name: collectionName }: { name: string } = JSON.parse(readFileSync(join(__dirname, 'collection', 'bruno.json'), 'utf8'));

export const multipartUpload = {
  endpoint: '/api/multipart/mixed-content-types',
  method: 'POST'
};

type UploadFile = {
  name: string;
  filename: string;
  contentType: string;
};

export const singleKeyFiles = ['first,upload.txt', 'second.txt'].map((filename): UploadFile => ({
  name: 'file1',
  filename,
  contentType: 'multipart/mixed'
}));

export const multipleKeyFiles = ['first,upload.webm', 'second upload.webm'].map((filename, index): UploadFile => ({
  name: `file${index + 1}`,
  filename,
  contentType: 'video/webm'
}));

export const writeUploadFiles = async (directory: string, files: UploadFile[]) =>
  Promise.all(files.map(async (file) => {
    const filePath = join(directory, file.filename);
    await writeFile(filePath, file.filename);
    return { ...file, filePath };
  }));
