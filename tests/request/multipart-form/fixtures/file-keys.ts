import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const { name: collectionName }: { name: string } = JSON.parse(
  readFileSync(join(__dirname, 'collection', 'bruno.json'), 'utf8')
);

export const uploadRequest = {
  url: 'http://localhost:8081/api/multipart/mixed-content-types',
  method: 'POST',
  statusCode: 200
};

export const fileKeyCases = [
  {
    id: 'TC-3243',
    title: 'uploads multiple files under one multipart key',
    fields: [{ key: 'file1', filenames: ['first upload.txt', 'second upload.txt'], contentType: 'multipart/mixed' }]
  },
  {
    id: 'TC-3246',
    title: 'uploads one file under each multipart key',
    fields: [
      { key: 'file1', filenames: ['first upload.webm'], contentType: 'video/webm' },
      { key: 'file2', filenames: ['second upload.webm'], contentType: 'video/webm' }
    ]
  }
];
