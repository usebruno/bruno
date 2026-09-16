jest.mock('utils/common', () => ({
  formatResponse: (data, dataBuffer, selectedFormat) => {
    if (selectedFormat === 'base64') {
      return dataBuffer;
    }

    if (selectedFormat === 'json') {
      return JSON.stringify(data, null, 2);
    }

    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  }
}));

import { getDownloadResponse } from './index';

describe('ResponseDownload', () => {
  it('builds a download response from the selected Base64 format', () => {
    const response = {
      data: 'pong',
      dataBuffer: Buffer.from('pong').toString('base64'),
      headers: {
        'content-type': 'text/plain'
      },
      size: 4
    };

    const downloadResponse = getDownloadResponse({
      response,
      selectedFormat: 'base64',
      selectedTab: 'editor',
      data: 'pong',
      dataBuffer: response.dataBuffer
    });

    expect(downloadResponse.data).toBe('cG9uZw==');
    expect(Buffer.from(downloadResponse.dataBuffer, 'base64').toString()).toBe('cG9uZw==');
    expect(downloadResponse.headers['content-type']).toBe('text/plain');
  });

  it('builds a download response from the selected JSON format', () => {
    const response = {
      data: { hello: 'bruno' },
      dataBuffer: Buffer.from('{"hello":"bruno"}').toString('base64'),
      headers: {
        'content-type': 'application/json'
      }
    };

    const downloadResponse = getDownloadResponse({
      response,
      selectedFormat: 'json',
      selectedTab: 'editor',
      data: response.data,
      dataBuffer: response.dataBuffer
    });

    expect(downloadResponse.data).toContain('"hello": "bruno"');
    expect(downloadResponse.headers['content-type']).toBe('application/json');
  });

  it('keeps the original response when no format is selected', () => {
    const response = {
      data: 'pong',
      dataBuffer: Buffer.from('pong').toString('base64')
    };

    const downloadResponse = getDownloadResponse({
      response,
      selectedFormat: null,
      selectedTab: 'editor',
      data: 'pong',
      dataBuffer: response.dataBuffer
    });

    expect(downloadResponse).toBe(response);
  });
});
